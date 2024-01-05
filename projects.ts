import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { IsNotEmpty } from "class-validator";
import { AuthGuard, AuthRequest } from "./auth_guard.js";

class NewDto { @IsNotEmpty() initial: string; }

@Controller("projects")
export class ProjectsController {
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.CREATED)
    @Post("/new")
    async new(@Request() req: AuthRequest, @Body() { initial }: NewDto) {

    }

    // get project data

    // delete project

    // generate project alias

    // delete project alias
}