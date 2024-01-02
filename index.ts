import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter, NestExpressApplication } from "@nestjs/platform-express";
import c from "class-validator";
import t from "class-transformer";
import { ValidationPipe } from "@nestjs/common";
import { AuthController } from "./auth.js";
import env from "./env.js";

@Module({
    imports: [],
    controllers: [AuthController],
    providers: []
})
class AppModule {}

const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter());
app.enableCors();
app.useGlobalPipes(new ValidationPipe({
    validatorPackage: c,
    transformerPackage: t
}));
console.log("Listening on port " + env.PORT);
await app.listen(env.PORT);