"use client";

import { useTranslations } from "next-intl";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, Lightbulb, AlertTriangle, CheckCircle, DollarSign, ArrowRight, FileDown, Scale, Loader2, Star,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "@/navigation";
import type { ScenarioResult } from "@/lib/scenario-calculator/types";
import { formatCHF, formatPercent } from "@/lib/scenario-calculator/calculations";
import { type ComparisonMeta } from "@/lib/scenario-calculator/pdf-export";

// ============================================================================
// RESULTS DISPLAY
// ============================================================================

export function ScenarioResults({
  results,
  comparison,
  onExportPDF,
  onRequestExpertReview,
  isRequestingReview,
}: {
  results: ScenarioResult;
  comparison?: ComparisonMeta;
  onExportPDF?: () => void;
  onRequestExpertReview?: () => void;
  isRequestingReview?: boolean;
}) {
  const t = useTranslations("ScenarioCalculator.results");
  const scenarioLabel = results.metadata.scenarioId
    ? t(`scenarioTitles.${results.metadata.scenarioId}`)
    : results.metadata.scenarioType;
  const scale = comparison ? comparison.scaleFactor : 1;
  const isPositiveChange = results.comparison.netIncomeChange > 0;
  const isTaxIncrease = results.comparison.taxDifference > 0;
  const isPillar3aScenario = results.metadata.scenarioType === "Pillar 3a";
  const hasHealthSubsidy = [
    ...(results.currentSituation.benefitsBreakdown ?? []),
    ...(results.futureSituation.benefitsBreakdown ?? []),
  ].some((benefit) => benefit.type === "subsidy" && /health insurance subsidy/i.test(benefit.label));

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t("analysisTitle", { scenario: scenarioLabel })}</CardTitle>
            <Badge variant="outline">{results.metadata.location}</Badge>
          </div>
          {hasHealthSubsidy && (
            <p className="text-xs text-emerald-700">
              {t("healthSubsidyIncluded")}
            </p>
          )}
          {comparison && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
              <Scale className="h-3 w-3" />
              {comparison.note}
            </p>
          )}
          <CardDescription>{results.analysis.summary}</CardDescription>
        </CardHeader>
      </Card>

      {/* Current vs Future Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SituationCard title={t("currentSituation")} situation={results.currentSituation} scale={scale} />
        <SituationCard title={t("futureSituation")} situation={results.futureSituation} scale={scale} />
      </div>

      {/* Impact Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={isTaxIncrease ? "border-red-200" : "border-green-200"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {isTaxIncrease ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
              {t("taxChange")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${isTaxIncrease ? "text-red-600" : "text-green-600"}`}>
              {isTaxIncrease ? "+" : ""}{formatCHF(results.comparison.taxDifference * scale)}
            </p>
            <p className="text-sm text-muted-foreground">
              {results.comparison.taxDifferencePct >= 0 ? "+" : ""}
              {results.comparison.taxDifferencePct.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className={isPositiveChange ? "border-green-200" : "border-red-200"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {isPositiveChange ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              {t("netIncomeChange")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${isPositiveChange ? "text-green-600" : "text-red-600"}`}>
              {isPositiveChange ? "+" : ""}{formatCHF(results.comparison.netIncomeChange * scale)}
            </p>
            <p className="text-sm text-muted-foreground">
              {results.comparison.netIncomeChangePct >= 0 ? "+" : ""}
              {results.comparison.netIncomeChangePct.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Benefits breakdown if any */}
      {results.futureSituation.benefitsBreakdown && results.futureSituation.benefitsBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              {t("allowancesBenefits")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.futureSituation.benefitsBreakdown.map((benefit, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{benefit.type}</Badge>
                  {benefit.label}
                </span>
                <span className="font-medium text-green-600">+{formatCHF(benefit.amount * scale)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t("totalAdditionalBenefits")}</span>
              <span className="font-bold text-green-600">
                +{formatCHF((results.futureSituation.additionalBenefits ?? 0) * scale)}{comparison ? `/${comparison.monthsRecorded} mo.` : t("perYearSuffix")}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis */}
      {results.analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              {t("recommendations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {results.analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {isPillar3aScenario && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("pillar3aOffers.title")}</CardTitle>
            <CardDescription>{t("pillar3aOffers.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/individual/tax-services">
                {t("pillar3aOffers.button")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Impacts */}
      {results.analysis.impacts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("potentialImpacts")}</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1">
              {results.analysis.impacts.map((impact, i) => (
                <li key={i} className="text-sm">{impact}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* PDF Export + Expert Review */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onExportPDF && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 flex-1"
            onClick={onExportPDF}
          >
            <FileDown className="h-4 w-4" />
            {t("exportPdf")}
          </Button>
        )}
        {onRequestExpertReview && (
          <Button
            variant="default"
            size="sm"
            className="gap-2 flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            onClick={onRequestExpertReview}
            disabled={isRequestingReview}
          >
            {isRequestingReview ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("expertReview.requesting")}</>
            ) : (
              <><Star className="h-4 w-4" /> {t("expertReview.button")}</>
            )}
          </Button>
        )}
      </div>
      {onRequestExpertReview && (
        <p className="text-xs text-muted-foreground text-right">
          {t("expertReview.description")}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// SITUATION CARD
// ============================================================================

function SituationCard({ title, situation, scale = 1 }: {
  title: string;
  situation: ScenarioResult["currentSituation"];
  scale?: number;
}) {
  const t = useTranslations("ScenarioCalculator.results.situationCard");
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm">{t("grossIncome")}</span>
          <span className="font-medium">{formatCHF(situation.grossIncome * scale)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">{t("totalTax")}</span>
          <span className="font-medium text-red-600">{formatCHF(situation.totalTax * scale)}</span>
        </div>
        {(situation.additionalBenefits ?? 0) > 0 && (
          <div className="flex justify-between">
            <span className="text-sm">{t("benefitsAllowances")}</span>
            <span className="font-medium text-blue-600">+{formatCHF(situation.additionalBenefits! * scale)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between">
          <span className="text-sm font-medium">{t("netIncome")}</span>
          <span className="font-bold text-green-600">{formatCHF(situation.netIncome * scale)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-muted-foreground">{t("effectiveTaxRate")}</span>
          <span className="text-xs">{formatPercent(situation.effectiveTaxRate)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SKELETON / LOADING
// ============================================================================

export function ResultsSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
      </Card>
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-6 space-y-3">
          <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" /><Skeleton className="h-6 w-24" />
        </CardContent></Card>
        <Card><CardContent className="pt-6 space-y-3">
          <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" /><Skeleton className="h-6 w-24" />
        </CardContent></Card>
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

export function EmptyResultsCard() {
  const t = useTranslations("ScenarioCalculator.results.emptyState");
  return (
    <Card className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
      <div className="rounded-full bg-muted p-4 mb-4">
        <TrendingUp className="h-8 w-8 text-muted-foreground" />
      </div>
      <CardTitle className="text-lg mb-2">{t("title")}</CardTitle>
      <CardDescription className="max-w-sm">
        {t("description")}
      </CardDescription>
    </Card>
  );
}
