import type { WebSocketServer } from "ws";
import { WebSocketGateway, OnGatewayInit } from "@nestjs/websockets";
import { hostname } from "node:os";
import { PeerId, Repo } from "@automerge/automerge-repo";
import { Injectable } from "@nestjs/common";
import { DbAdapter } from "./storage.js";
import { HackendWSServerAdapter } from "./network.js";

@WebSocketGateway()
@Injectable()
export class AutomergeGateway implements OnGatewayInit {
    // @NestWebSocketServer()
    // socket: WebSocketServer;
    repo: Repo;
    networkAdapter: HackendWSServerAdapter;

    afterInit(socket: WebSocketServer) {
        this.networkAdapter = new HackendWSServerAdapter(socket);
        const config = {
            network: [this.networkAdapter],
            storage: new DbAdapter(),
            peerId: `storage-server-${hostname()}` as PeerId,
            sharePolicy: async () => false
        };
        this.repo = new Repo(config);
    }


}