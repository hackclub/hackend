import { Logger, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter, NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { AuthController } from "./auth.js";
import env from "./env.js";
import { AutomergeGateway } from "./automerge/gateway.js";
import { WsAdapter } from "@nestjs/platform-ws";
import { ProjectsController } from "./projects.js";

const logger = new Logger("hackend");

@Module({
    imports: [],
    controllers: [AuthController, ProjectsController],
    providers: [AutomergeGateway]
})
class AppModule {}

const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter());
app.enableCors();
app.useGlobalPipes(new ValidationPipe());
app.useWebSocketAdapter(new WsAdapter(app));
logger.log("Listening on port " + env.PORT);
await app.listen(env.PORT);