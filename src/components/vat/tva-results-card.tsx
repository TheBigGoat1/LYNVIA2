'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCHF } from '@/lib/scenario-calculator/calculations';

export interface TVAComparisonResult {
  tvaEffective: number;
  tvaTDFN: number;
  methodeRecommandee: 'Effective' | 'TDFN';
  economie: number;
  detailEffective: {
    tvaDueParTaux: Array<{ taux: number; montantCA: number; tvaDue: number }>;
    impotPrealable: number;
    totalTvaDue: number;
  };
  detailTDFN: {
    parSecteur: Array<{ nom: string; montantCA: number; tauxTDFN: number; tvaDue: number }>;
    standardCA: number;
    standardTvaDue: number;
    totalTvaDue: number;
  };
}

interface TVAResultsCardProps {
  results: TVAComparisonResult;
}

export default function TVAResultsCard({ results }: TVAResultsCardProps) {
  const { tvaEffective, tvaTDFN, methodeRecommandee, economie, detailEffective, detailTDFN } = results;

  return (
    <div className="space-y-4">
      {/* Side-by-side comparison */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Méthode Effective */}
        <Card className={methodeRecommandee === 'Effective' ? 'border-green-500 bg-green-50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Méthode Effective
              {methodeRecommandee === 'Effective' && (
                <Badge className="bg-green-600">Recommandée</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 mb-1">TVA due estimée</p>
              <p className="text-2xl font-bold text-gray-900">{formatCHF(tvaEffective)}</p>
            </div>

            {detailEffective.tvaDueParTaux.length > 0 && (
              <div className="space-y-1 text-xs text-gray-600 border-t pt-2">
                <p className="font-medium text-gray-700">Détail TVA collectée :</p>
                {detailEffective.tvaDueParTaux.map((t, i) => (
                  <div key={i} className="flex justify-between">
                    <span>CA {t.taux}% ({formatCHF(t.montantCA)})</span>
                    <span>{formatCHF(t.tvaDue)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span>− Impôt préalable</span>
                  <span className="text-red-600">−{formatCHF(detailEffective.impotPrealable)}</span>
                </div>
                <div className="flex justify-between font-medium text-gray-800">
                  <span>= TVA due</span>
                  <span>{formatCHF(detailEffective.totalTvaDue)}</span>
                </div>
              </div>
            )}

            <div className="mt-3 text-xs text-gray-500">
              <p>Calcul: TVA collectée − Impôt préalable</p>
              <p>Basé sur les taux réels par catégorie</p>
            </div>
          </CardContent>
        </Card>

        {/* Méthode TDFN */}
        <Card className={methodeRecommandee === 'TDFN' ? 'border-green-500 bg-green-50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Méthode TDFN
              {methodeRecommandee === 'TDFN' && (
                <Badge className="bg-green-600">Recommandée</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 mb-1">TVA due estimée</p>
              <p className="text-2xl font-bold text-gray-900">{formatCHF(tvaTDFN)}</p>
            </div>

            {detailTDFN.parSecteur.length > 0 && (
              <div className="space-y-1 text-xs text-gray-600 border-t pt-2">
                <p className="font-medium text-gray-700">Détail par secteur :</p>
                {detailTDFN.parSecteur.map((s, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate mr-2">{s.nom} ({(s.tauxTDFN * 100).toFixed(1)}%)</span>
                    <span>{formatCHF(s.tvaDue)}</span>
                  </div>
                ))}
                {detailTDFN.standardTvaDue > 0 && (
                  <div className="flex justify-between">
                    <span>CA standard (taux moyen)</span>
                    <span>{formatCHF(detailTDFN.standardTvaDue)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-gray-800 border-t pt-1 mt-1">
                  <span>= TVA due</span>
                  <span>{formatCHF(detailTDFN.totalTvaDue)}</span>
                </div>
              </div>
            )}

            <div className="mt-3 text-xs text-gray-500">
              <p>Calcul: CA brut × taux TDFN secteur</p>
              <p>Taux forfaitaire par branche d&apos;activité</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary result */}
      <Card className="bg-gray-50">
        <CardContent className="p-6">
          <div className="text-center">
            <h4 className="font-medium mb-2">Résultat de l&apos;analyse</h4>
            <div className="flex items-center justify-center gap-4">
              <Badge
                className={`text-lg px-4 py-2 ${
                  methodeRecommandee === 'Effective' ? 'bg-green-600' : 'bg-blue-600'
                }`}
              >
                Méthode la plus avantageuse : {methodeRecommandee}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Économie estimée : <span className="font-medium text-green-600">{formatCHF(economie)}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
