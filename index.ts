import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter, NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { AuthController } from "./auth.js";
import env from "./env.js";
import { AutomergeGateway } from "./automerge/gateway.js";
import { WsAdapter } from "@nestjs/platform-ws";

@Module({
    imports: [],
    controllers: [AuthController],
    providers: [AutomergeGateway]
})
class AppModule {}

const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter());
app.enableCors();
app.useGlobalPipes(new ValidationPipe());
app.useWebSocketAdapter(new WsAdapter(app));
console.log("Listening on port " + env.PORT);
await app.listen(env.PORT);