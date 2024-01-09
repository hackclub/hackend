import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Post,
    Query,
    Request,
    UseGuards
} from "@nestjs/common";
import { IsNotEmpty } from "class-validator";
import { AuthGuard, AuthRequest } from "./auth_guard.js";
import { AutomergeGateway } from "./automerge/gateway.js";
import { db } from "./db/client.js";
import { project_aliases, projects } from "./db/schema.js";
import { and, eq } from "drizzle-orm";
import { AutomergeUrl } from "@automerge/automerge-repo";
import { urlPrefix } from "@automerge/automerge-repo/dist/AutomergeUrl.js";
import { ProjectData } from "./types.js";

export class NewDto { @IsNotEmpty() initial: any; @IsNotEmpty() meta: any; }
export class UpdateDto { @IsNotEmpty() id: string; @IsNotEmpty() meta: any; }
export class GetDto { @IsNotEmpty() id: string; }
export class DeleteDto { @IsNotEmpty() id: string; }
export class NewAliasDto { @IsNotEmpty() id: string; }
export class DeleteAliasDto { @IsNotEmpty() alias: string; }

@Controller("projects")
export class ProjectsController {
    constructor(private automerge: AutomergeGateway) {}

    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.CREATED)
    @Post("/new")
    async new(@Request() { uid }: AuthRequest, @Body() { initial, meta }: NewDto) {
        const docHandle = this.automerge.repo.create();
        docHandle.change((d: any) => {
            Object.assign(d, initial);
        });
        // save to db
        const result = await db.insert(projects).values({ uid, meta: JSON.stringify(meta), automerge_url: docHandle.documentId })
            .returning({ id: projects.id });
        if (result.length !== 1) throw new Error("Failed to insert project");
        return result[0].id;
    }

    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post("/update")
    async update(@Request() { uid }: AuthRequest, @Body() { id, meta }: UpdateDto) {
        const result = await db.update(projects).set({ meta: JSON.stringify(meta) }).where(and(
            eq(projects.id, id),
            eq(projects.uid, uid)
        )).returning();
        if(result.length !== 1) throw new NotFoundException("Project not found");
        return "OK";
    }

    // get project data
    // this shouldn't need to be authenticated, all projects are public read
    @HttpCode(HttpStatus.OK)
    @Get("/get")
    async get(@Query() { id }: GetDto): Promise<ProjectData> {
        // get the automerge id
        const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
        if(result.length !== 1) throw new NotFoundException("Project not found");
        const url = result[0].automerge_url;
        const docHandle = this.automerge.repo.find((urlPrefix + url) as AutomergeUrl);
        if(!docHandle) throw new Error("Failed to find document in Automerge, even though it exists in DB");
        const doc = await docHandle.doc();
        return {
            id,
            doc,
            meta: result[0].meta
        };
    }

    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.OK)
    @Get("/list")
    async list(@Request() { uid }: AuthRequest): Promise<Omit<ProjectData, "doc">[]> {
        return db.select({ id: projects.id, meta: projects.meta }).from(projects).where(eq(projects.uid, uid));
    }

    // delete project
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post("/delete")
    async delete(@Request() { uid }: AuthRequest, @Body() { id }: DeleteDto) {
        const result = await db.delete(projects).where(and(
            eq(projects.id, id),
            eq(projects.uid, uid)
        )).returning();
        if (result.length !== 1) throw new NotFoundException("Project not found");
        // delete from automerge
        const url = result[0].automerge_url;
        this.automerge.repo.delete(url as AutomergeUrl);

        return "OK";
    }

    // generate project alias
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.CREATED)
    @Post("/new_alias")
    async new_alias(@Request() { uid }: AuthRequest, @Body() { id }: NewAliasDto) {
        // make sure the user owns the project
        const projectResult = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
        if (projectResult.length !== 1 || projectResult[0].uid !== uid) throw new NotFoundException("Project not found");
        // generate alias
        const result = await db.insert(project_aliases).values({ project_id: id }).returning({ id: project_aliases.id });
        if (result.length !== 1) throw new Error("Failed to insert project alias");
        return result[0].id;
    }

    // delete project alias
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post("/delete_alias")
    async delete_alias(@Request() { uid }: AuthRequest, @Body() { alias }: DeleteAliasDto) {
        // verify alias is of a project owned by the requesting user
        const selectResult = await db.select().from(project_aliases)
            .innerJoin(projects, eq(project_aliases.project_id, projects.id))
            .where(and(
                eq(project_aliases.id, alias),
                eq(projects.uid, uid)
            )).limit(1);

        if (selectResult.length !== 1) throw new NotFoundException("Project alias not found");

        // delete alias
        await db.delete(project_aliases).where(eq(project_aliases.id, alias));

        return "OK";
    }

    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.OK)
    @Get("/list_aliases")
    async list_aliases(@Request() { uid }: AuthRequest, @Query() { id }: GetDto) {
        // verify project is owned by the requesting user
        const selectResult = await db.select().from(projects).where(and(
            eq(projects.id, id),
            eq(projects.uid, uid)
        )).limit(1);

        if (selectResult.length !== 1) throw new NotFoundException("Project not found");

        // list aliases
        const result = await db.select({ id: project_aliases.id }).from(project_aliases)
            .where(eq(project_aliases.project_id, id));
        return result.map(r => r.id);
    }
}