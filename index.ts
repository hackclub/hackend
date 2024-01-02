import "dotenv/config";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter, NestExpressApplication } from "@nestjs/platform-express";
import { AuthController } from "./auth.js";

@Module({
    imports: [],
    controllers: [AuthController],
    providers: []
})
class AppModule {}

const port = 3000;

const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter());
app.enableCors();
console.log("Listening on port " + port);
await app.listen(port);