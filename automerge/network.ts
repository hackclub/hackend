// modifying the stock NodeWSServerAdapter to support our custom IDs + auth

import WebSocket, { type WebSocketServer } from "isomorphic-ws";

import { cbor as cborHelpers, NetworkAdapter, type PeerId, type PeerMetadata } from "@automerge/automerge-repo";
import { FromServerMessage, ProtocolVersion } from "@automerge/automerge-repo-network-websocket";
import { check_token } from "../auth_guard.js";
import { Logger } from "@nestjs/common";
import { project_aliases, projects } from "../db/schema.js";
import { db } from "../db/client.js";
import { eq } from "drizzle-orm";
import { HackendFromClientMessage } from "../types.js";

const logger = new Logger("WebsocketServer");

const { encode, decode } = cborHelpers;

interface WebSocketWithIsAlive extends WebSocket {
    isAlive: boolean;
}

type SocketData = {
    socket: WebSocket,
    // map of real project ID to the one that's being used by this client
    aliases: Record<string, string>,
    // false if not authenticated, otherwise the UID
    auth: false | string
}

export class HackendWSServerAdapter extends NetworkAdapter {
    server: WebSocketServer;
    sockets: { [peerId: PeerId]: SocketData } = {};

    constructor(server: WebSocketServer) {
        super();
        this.server = server;
    }

    // initialize the server
    connect(peerId: PeerId, peerMetadata: PeerMetadata) {
        this.peerId = peerId;
        this.peerMetadata = peerMetadata;

        this.server.on("close", function close() {
            clearInterval(ensureAliveInterval);
        });

        this.server.on("connection", (socket: WebSocketWithIsAlive/*, request*/) => {
            socket.on("close", () => this.#onClientDisconnect(socket));

            socket.on("message", message =>
                this.#receiveMessage(message as Uint8Array, socket)
            );

            // Start out "alive", and every time we get a pong, reset that state.
            socket.isAlive = true;
            socket.on("pong", () => (socket.isAlive = true));

            this.emit("ready", { network: this });
        });

        // Every interval, terminate connections to lost clients,
        // then mark all clients as potentially dead and then ping them.
        const ensureAliveInterval = setInterval(() => {
            ;(this.server.clients as Set<WebSocketWithIsAlive>).forEach(socket => {
                if (!socket.isAlive) {
                    // Make sure we clean up this socket even though we're terminating.
                    // This might be unnecessary but I have read reports of the close() not happening for 30s.
                    for (const [otherPeerId, { socket: otherSocket }] of Object.entries(
                        this.sockets
                    )) {
                        if (socket === otherSocket) {
                            this.emit("peer-disconnected", { peerId: otherPeerId as PeerId });
                            delete this.sockets[otherPeerId as PeerId];
                        }
                    }
                    return socket.terminate();
                }
                socket.isAlive = false;
                socket.ping();
            });
        }, 5000);
    }

    disconnect() {
        // throw new Error("The server doesn't join channels.")
    }

    // send a message to a client
    async send(message: FromServerMessage) {
        if ("data" in message && message.data.byteLength === 0) {
            throw new Error("tried to send a zero-length message");
        }
        const senderId = this.peerId;
        if (!senderId) {
            throw new Error("No peerId set for the websocket server network adapter.");
        }

        if (this.sockets[message.targetId] === undefined) {
            logger.warn(`Tried to send message to disconnected peer: ${message.targetId}`);
            return;
        }

        // replace the automerge url with the project ID that the client knows about

        //@ts-expect-error
        const documentId = message.documentId;
        console.log("DEBUG", documentId); // TODO: ensure the documentid is in the same format as in the db
        if(documentId) {
            // fetch corresponding project ID from database
            const result = await db.select().from(projects).where(eq(projects.automerge_url, documentId));
            if(result.length === 0) {
                logger.error(`Server attempted to send message about document ${documentId} that's not associated with a project`);
            }
            else {
                const alias = this.sockets[message.targetId].aliases[result[0].id];
                if (alias) {
                    message.
                        //@ts-expect-error
                        documentId = alias;
                } else if(result[0].uid === this.sockets[message.targetId].auth) {
                    // this user created the project, so they can see it
                    message.
                        //@ts-expect-error
                        documentId = result[0].id;
                } else {
                    logger.error(`Server attempted to send a message about project ${result[0].id} to user ${this.sockets[message.targetId].auth} who doesn't have access to it`);
                    return;
                }
            }
        }

        const encoded = encode(message);
        // This incantation deals with websocket sending the whole
        // underlying buffer even if we just have a uint8array view on it
        const arrayBuf = encoded.buffer.slice(
            encoded.byteOffset,
            encoded.byteOffset + encoded.byteLength
        );

        this.sockets[message.targetId]?.socket.send(arrayBuf);
    }

    // cleanup when a client disconnects
    #onClientDisconnect(socket: WebSocketWithIsAlive) {
        // When a socket closes, or disconnects, remove it from our list
        for (const [otherPeerId, { socket: otherSocket }] of Object.entries(this.sockets)) {
            if (socket === otherSocket) {
                this.emit("peer-disconnected", { peerId: otherPeerId as PeerId });
                delete this.sockets[otherPeerId as PeerId];
            }
        }
    }

    #closeClientSocket(peerId: PeerId) {
        this.sockets[peerId].socket.close();
        delete this.sockets[peerId];
    }

    // receive a message from a client
    async #receiveMessage(message: Uint8Array, socket: WebSocket) {
        const cbor: HackendFromClientMessage = decode(message);

        const { type, senderId } = cbor;

        const myPeerId = this.peerId;
        if (!myPeerId) {
            throw new Error("Missing my peer ID.");
        }
        logger.verbose(
            `[${senderId}->${myPeerId}${
                "documentId" in cbor ? "@" + cbor.documentId : ""
            }] ${type} | ${message.byteLength} bytes`
        );

        if(type === "authenticate") {
            const { token } = cbor;
            const payload = await check_token(token);
            if (payload) {
                this.sockets[senderId].auth = payload.uid;
            } else {
                // invalid token
                logger.verbose(`${senderId} tried to auth with invalid token`);
                await this.send({
                    type: "error",
                    senderId: this.peerId!,
                    message: "invalid token",
                    targetId: senderId
                });
                this.#closeClientSocket(senderId);
            }
            return;
        }

        if(!this.sockets[senderId].auth) {
            logger.warn(`${senderId} tried to send a message but isn't authenticated!`);
            await this.send({
                type: "error",
                senderId: this.peerId!,
                message: "not authenticated",
                targetId: senderId
            });
            this.#closeClientSocket(senderId);
            return;
        }

        switch (type) {
            case "join": {
                const existingSocket = this.sockets[senderId].socket;
                if (existingSocket) {
                    if (existingSocket.readyState === WebSocket.OPEN) {
                        existingSocket.close();
                    }
                    this.emit("peer-disconnected", { peerId: senderId });
                }

                const { peerMetadata } = cbor;
                // Let the rest of the system know that we have a new connection.
                this.emit("peer-candidate", {
                    peerId: senderId,
                    peerMetadata
                });
                this.sockets[senderId] = {
                    socket,
                    aliases: {},
                    auth: false
                };

                // In this client-server connection, there's only ever one peer: us!
                // (and we pretend to be joined to every channel)
                const selectedProtocolVersion = selectProtocol(
                    cbor.supportedProtocolVersions
                );
                if (selectedProtocolVersion !== ProtocolVHackend1) {
                    await this.send({
                        type: "error",
                        senderId: this.peerId!,
                        message: "unsupported protocol version",
                        targetId: senderId
                    });
                    this.#closeClientSocket(senderId);
                } else {
                    await this.send({
                        type: "peer",
                        senderId: this.peerId!,
                        peerMetadata: this.peerMetadata!,
                        selectedProtocolVersion: ProtocolVHackend1 as ProtocolVersion,
                        targetId: senderId
                    });
                }
            }
                break;
            case "leave":
                // It doesn't seem like this gets called;
                // we handle leaving in the socket close logic
                // TODO: confirm this
                // ?
                logger.error("leave message received; we currently don't expect to get this and need to handle it properly.");
                break;

            default:
                // replace the client's project ID with the actual automerge url
                //@ts-expect-error
                const documentId = cbor.documentId;
                if(documentId) {
                    // try to treat it as an alias first
                    const aliasResult = await db.select().from(project_aliases).where(eq(project_aliases.id, documentId));
                    const projectId = aliasResult.length > 0 ? aliasResult[0].project_id : documentId;
                    const projectResult = await db.select().from(projects).where(eq(projects.id, projectId));
                    if(projectResult.length === 0) {
                        logger.warn(`Client attempted to send message about project ${projectId} that doesn't exist`);
                        return;
                    }
                    if(aliasResult.length > 0) {
                        this.sockets[senderId].aliases[projectId] = documentId;
                    } else if(projectResult[0].uid !== this.sockets[senderId].auth) {
                        logger.warn(`Client tried to send a message about project ${projectId} but doesn't have permission for the project`);
                        return
                    }

                    cbor.
                        //@ts-expect-error
                        documentId = projectResult[0].automerge_url;
                }
                this.emit("message", cbor);
                break;
        }
    }
}

const ProtocolV1 = "1";
const ProtocolVHackend1 = "hackend1";
function selectProtocol(versions?: (ProtocolVersion | typeof ProtocolVHackend1)[]): (ProtocolVersion | typeof ProtocolVHackend1) | null {
    if (versions === undefined) {
        return ProtocolV1;
    }
    if(versions.includes(ProtocolVHackend1)) {
        return ProtocolVHackend1;
    } else if (versions.includes(ProtocolV1)) {
        return ProtocolV1;
    }
    return null;
}
