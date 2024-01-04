// modifying the stock NodeWSServerAdapter to support our custom IDs + auth

import WebSocket from "isomorphic-ws"
import { type WebSocketServer } from "isomorphic-ws"

import debug from "debug"
const log = debug("WebsocketServer")

import {
    cbor as cborHelpers,
    NetworkAdapter,
    type PeerMetadata,
    type PeerId,
} from "@automerge/automerge-repo"
import {
    FromClientMessage,
    FromServerMessage,
    ProtocolVersion
} from "@automerge/automerge-repo-network-websocket";
import { ProtocolV1 } from "@automerge/automerge-repo-network-websocket/src/protocolVersion.js";
import { check_token } from "../auth_guard.js";

const { encode, decode } = cborHelpers

type HackendFromClientMessage = FromClientMessage | {
    type: "authenticate",
    senderId: PeerId,
    token: string
};

interface WebSocketWithIsAlive extends WebSocket {
    isAlive: boolean
}

type SocketData = {
    socket: WebSocket,
    aliases: Record<string, string>, // map of real project ID to the one that's being used by this client
    auth: false | string // false if not authenticated, otherwise the UID
}

export class HackendWSServerAdapter extends NetworkAdapter {
    server: WebSocketServer
    sockets: { [peerId: PeerId]: SocketData } = {}

    constructor(server: WebSocketServer) {
        super()
        this.server = server
    }

    connect(peerId: PeerId, peerMetadata: PeerMetadata) {
        this.peerId = peerId
        this.peerMetadata = peerMetadata

        this.server.on("close", function close() {
            clearInterval(interval)
        })

        this.server.on("connection", (socket: WebSocketWithIsAlive/*, request*/) => {
            // When a socket closes, or disconnects, remove it from our list
            socket.on("close", () => {
                for (const [otherPeerId, { socket: otherSocket }] of Object.entries(this.sockets)) {
                    if (socket === otherSocket) {
                        this.emit("peer-disconnected", { peerId: otherPeerId as PeerId })
                        delete this.sockets[otherPeerId as PeerId]
                    }
                }
            })

            socket.on("message", message =>
                this.receiveMessage(message as Uint8Array, socket)
            )

            // Start out "alive", and every time we get a pong, reset that state.
            socket.isAlive = true
            socket.on("pong", () => (socket.isAlive = true))

            this.emit("ready", { network: this })
        })

        // Every interval, terminate connections to lost clients,
        // then mark all clients as potentially dead and then ping them.
        const interval = setInterval(() => {
            ;(this.server.clients as Set<WebSocketWithIsAlive>).forEach(socket => {
                if (!socket.isAlive) {
                    // Make sure we clean up this socket even though we're terminating.
                    // This might be unnecessary but I have read reports of the close() not happening for 30s.
                    for (const [otherPeerId, { socket: otherSocket }] of Object.entries(
                        this.sockets
                    )) {
                        if (socket === otherSocket) {
                            this.emit("peer-disconnected", { peerId: otherPeerId as PeerId })
                            delete this.sockets[otherPeerId as PeerId]
                        }
                    }
                    return socket.terminate()
                }
                socket.isAlive = false
                socket.ping()
            })
        }, 5000)
    }

    disconnect() {
        // throw new Error("The server doesn't join channels.")
    }

    send(message: FromServerMessage) {
        if ("data" in message && message.data.byteLength === 0) {
            throw new Error("tried to send a zero-length message")
        }
        const senderId = this.peerId
        if (!senderId) {
            throw new Error("No peerId set for the websocket server network adapter.")
        }

        if (this.sockets[message.targetId] === undefined) {
            log(`Tried to send message to disconnected peer: ${message.targetId}`)
            return
        }

        const encoded = encode(message)
        // This incantation deals with websocket sending the whole
        // underlying buffer even if we just have a uint8array view on it
        const arrayBuf = encoded.buffer.slice(
            encoded.byteOffset,
            encoded.byteOffset + encoded.byteLength
        )

        this.sockets[message.targetId]?.socket.send(arrayBuf)
    }

    async receiveMessage(message: Uint8Array, socket: WebSocket) {
        const cbor: HackendFromClientMessage = decode(message)

        const { type, senderId } = cbor

        const myPeerId = this.peerId
        if (!myPeerId) {
            throw new Error("Missing my peer ID.")
        }
        log(
            `[${senderId}->${myPeerId}${
                "documentId" in cbor ? "@" + cbor.documentId : ""
            }] ${type} | ${message.byteLength} bytes`
        )
        switch (type) {
            case "authenticate":
            {
                const { token } = cbor;
                const payload = await check_token(token);
                if(payload) {
                    this.sockets[senderId].auth = payload.uid;
                }
                break;
            }
            case "join":
            {
                const existingSocket = this.sockets[senderId].socket
                if (existingSocket) {
                    if (existingSocket.readyState === WebSocket.OPEN) {
                        existingSocket.close()
                    }
                    this.emit("peer-disconnected", { peerId: senderId })
                }

                const { peerMetadata } = cbor
                // Let the rest of the system know that we have a new connection.
                this.emit("peer-candidate", {
                    peerId: senderId,
                    peerMetadata,
                })
                this.sockets[senderId] = {
                    socket,
                    aliases: {},
                    auth: false
                };

                // In this client-server connection, there's only ever one peer: us!
                // (and we pretend to be joined to every channel)
                const selectedProtocolVersion = selectProtocol(
                    cbor.supportedProtocolVersions
                )
                if (selectedProtocolVersion === null) {
                    this.send({
                        type: "error",
                        senderId: this.peerId!,
                        message: "unsupported protocol version",
                        targetId: senderId,
                    })
                    this.sockets[senderId].socket.close()
                    delete this.sockets[senderId]
                } else {
                    this.send({
                        type: "peer",
                        senderId: this.peerId!,
                        peerMetadata: this.peerMetadata!,
                        selectedProtocolVersion: ProtocolV1,
                        targetId: senderId,
                    })
                }
            }
                break
            case "leave":
                // It doesn't seem like this gets called;
                // we handle leaving in the socket close logic
                // TODO: confirm this
                // ?
                break

            default:
                this.emit("message", cbor)
                break
        }
    }
}

function selectProtocol(versions?: ProtocolVersion[]): ProtocolVersion | null {
    if (versions === undefined) {
        return ProtocolV1
    }
    if (versions.includes(ProtocolV1)) {
        return ProtocolV1
    }
    return null
}
