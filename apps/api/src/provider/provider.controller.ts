import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import {
  visitNoteCreateSchema,
  type DashboardResponse,
  type NpRosterEntry,
  type PatientDetailResponse,
  type QueueInsightsResponse,
  type RoundingListQuery,
  type VisitNote,
} from "@smart-rounding/contracts";
import { Roles } from "../auth/auth.decorators.js";
import type {
  AuthenticatedPrincipal,
  AuthenticatedRequest,
} from "../auth/auth.types.js";
import {
  ProviderService,
  type ProviderSummary,
  type RoundingListPage,
} from "./provider.service.js";

const principalOf = (request: AuthenticatedRequest): AuthenticatedPrincipal => {
  if (!request.principal) throw new Error("Authenticated principal missing");
  return request.principal;
};

/**
 * Provider-facing data. Every scope comes from the authenticated principal,
 * never from the query string.
 */
@Controller("provider")
@Roles("PHYSICIAN", "NURSE_PRACTITIONER")
export class ProviderController {
  constructor(private readonly providerService: ProviderService) {}

  /** Dashboard totals and chart aggregates for today's visits. */
  @Get("summary")
  summary(@Req() request: AuthenticatedRequest): Promise<ProviderSummary> {
    return this.providerService.summary(principalOf(request));
  }

  @Get("dashboard")
  async dashboard(
    @Req() request: AuthenticatedRequest,
  ): Promise<DashboardResponse> {
    return (await this.providerService.summary(principalOf(request))).dashboard;
  }

  @Get("queue-insights")
  async queueInsights(
    @Req() request: AuthenticatedRequest,
  ): Promise<QueueInsightsResponse> {
    return (await this.providerService.summary(principalOf(request))).insights;
  }

  /** Today's visits for the signed-in provider. */
  @Get("rounding-list")
  roundingList(
    @Query() query: RoundingListQuery,
    @Req() request: AuthenticatedRequest,
  ): Promise<RoundingListPage> {
    return this.providerService.roundingList(query, principalOf(request));
  }

  /** Every resident the signed-in provider covers. */
  @Get("caseload")
  caseload(
    @Query() query: RoundingListQuery,
    @Req() request: AuthenticatedRequest,
  ): Promise<RoundingListPage> {
    return this.providerService.caseload(query, principalOf(request));
  }

  @Get("patients/:id")
  patient(
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<PatientDetailResponse> {
    return this.providerService.patient(
      id,
      principalOf(request),
      request.ip ?? null,
    );
  }

  @Get("patients/:id/notes")
  notes(
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<VisitNote[]> {
    return this.providerService.visitNotes(id, principalOf(request));
  }

  @Post("patients/:id/notes")
  addNote(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<VisitNote> {
    const parsed = visitNoteCreateSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException("A visit note needs 3–4000 characters.");
    return this.providerService.addVisitNote(
      id,
      parsed.data.note,
      principalOf(request),
    );
  }

  /** Physician oversight of the NP team. */
  @Get("np-roster")
  @Roles("PHYSICIAN")
  npRoster(): Promise<NpRosterEntry[]> {
    return this.providerService.npRoster();
  }

  @Get("np-roster/:npId")
  @Roles("PHYSICIAN")
  npRosterEntry(@Param("npId") npId: string): Promise<NpRosterEntry> {
    return this.providerService.npRosterEntry(npId);
  }

  @Get("np-roster/:npId/caseload")
  @Roles("PHYSICIAN")
  npCaseload(
    @Param("npId") npId: string,
    @Query() query: RoundingListQuery,
  ): Promise<RoundingListPage> {
    return this.providerService.npCaseload(npId, query);
  }
}
