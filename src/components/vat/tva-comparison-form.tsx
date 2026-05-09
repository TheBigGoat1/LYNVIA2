'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { getTdfnList } from '@/lib/tdfn-secteurs';

export interface TVAFormData {
  CA_0: number;
  CA_26: number;
  CA_38: number;
  CA_81: number;
  achats_26: number;
  achats_81: number;
  depenses_26: number;
  depenses_81: number;
  secteurs: Array<{
    nom: string;
    montantCA: number;
    tauxTVA: number;
  }>;
}

interface TVAComparisonFormProps {
  onCalculate: (data: TVAFormData) => void;
  isLoading?: boolean;
}

export default function TVAComparisonForm({ onCalculate, isLoading }: TVAComparisonFormProps) {
  const [formData, setFormData] = useState<TVAFormData>({
    CA_0: 0,
    CA_26: 0,
    CA_38: 0,
    CA_81: 0,
    achats_26: 15000,
    achats_81: 10000,
    depenses_26: 5000,
    depenses_81: 5000,
    secteurs: []
  });

  const [selectedSecteur, setSelectedSecteur] = useState<string>('');
  const [secteurCA, setSecteurCA] = useState<number>(0);
  const [secteurTVA, setSecteurTVA] = useState<number>(8.1);
  const tdfnOptions = getTdfnList();

  const handleInputChange = (field: keyof Omit<TVAFormData, 'secteurs'>, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  const addSecteur = () => {
    if (selectedSecteur && secteurCA > 0) {
      const secteurExists = formData.secteurs.some(s => s.nom === selectedSecteur);
      if (!secteurExists) {
        setFormData(prev => ({
          ...prev,
          secteurs: [...prev.secteurs, { nom: selectedSecteur, montantCA: secteurCA, tauxTVA: secteurTVA }]
        }));
        setSelectedSecteur('');
        setSecteurCA(0);
        setSecteurTVA(8.1);
      }
    }
  };

  const removeSecteur = (secteurNom: string) => {
    setFormData(prev => ({
      ...prev,
      secteurs: prev.secteurs.filter(s => s.nom !== secteurNom)
    }));
  };

  const updateSecteurCA = (secteurNom: string, nouveauCA: number) => {
    setFormData(prev => ({
      ...prev,
      secteurs: prev.secteurs.map(s => s.nom === secteurNom ? { ...s, montantCA: nouveauCA } : s)
    }));
  };

  const updateSecteurTVA = (secteurNom: string, nouveauTaux: number) => {
    setFormData(prev => ({
      ...prev,
      secteurs: prev.secteurs.map(s => s.nom === secteurNom ? { ...s, tauxTVA: nouveauTaux } : s)
    }));
  };

  const getTdfnRate = (secteur: string) => {
    const found = tdfnOptions.find(t => t.branche === secteur);
    return found ? (found.tdfn * 100).toFixed(1) : '0.0';
  };

  const totalCAStandard = formData.CA_0 + formData.CA_26 + formData.CA_38 + formData.CA_81;
  const totalCASecteurs = formData.secteurs.reduce((sum, s) => sum + s.montantCA, 0);
  const totalCA = totalCAStandard + totalCASecteurs;

  const handleCalculate = () => { onCalculate(formData); };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparateur TVA : Effective vs TDFN</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Section 1: Secteurs d'activité */}
        <div>
          <h4 className="font-medium mb-3 text-lg">
            1. Répartition du chiffre d&apos;affaires par secteur d&apos;activité
          </h4>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Instructions :</strong> Saisissez votre CA net réparti par secteur d&apos;activité.
              Chaque secteur aura son propre taux TDFN pour la comparaison.
            </p>
          </div>

          {/* Add sector form */}
          <div className="border rounded-lg p-4 mb-4 bg-gray-50">
            <Label className="text-sm font-medium mb-2 block">Ajouter un secteur :</Label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <div>
                <Label className="text-xs text-gray-600">Secteur d&apos;activité</Label>
                <Select value={selectedSecteur} onValueChange={setSelectedSecteur}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {tdfnOptions.map((option) => (
                      <SelectItem
                        key={option.branche}
                        value={option.branche}
                        disabled={formData.secteurs.some(s => s.nom === option.branche)}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="truncate mr-2">{option.branche}</span>
                          <Badge variant="outline" className="text-xs">
                            TDFN {(option.tdfn * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-600">CA net (CHF)</Label>
                <Input
                  type="number"
                  value={secteurCA}
                  onChange={(e) => setSecteurCA(parseFloat(e.target.value) || 0)}
                  placeholder="Ex: 50000"
                />
              </div>

              <div>
                <Label className="text-xs text-gray-600">Taux TVA effectif</Label>
                <Select value={secteurTVA.toString()} onValueChange={(v) => setSecteurTVA(parseFloat(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="2.6">2.6%</SelectItem>
                    <SelectItem value="3.8">3.8%</SelectItem>
                    <SelectItem value="8.1">8.1%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={addSecteur} disabled={!selectedSecteur || secteurCA <= 0} className="w-full">
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
              </div>
            </div>
          </div>

          {/* Added sectors list */}
          {formData.secteurs.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Secteurs configurés ({formData.secteurs.length}) :</Label>
              {formData.secteurs.map((secteur, index) => (
                <div key={index} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <span className="font-medium text-sm">{secteur.nom}</span>
                      <div className="flex gap-4 text-xs text-gray-600 mt-1">
                        <span>Taux TDFN: {getTdfnRate(secteur.nom)}%</span>
                        <span>Taux TVA effectif: {secteur.tauxTVA}%</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSecteur(secteur.nom)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600">CA net (CHF)</Label>
                      <Input
                        type="number"
                        value={secteur.montantCA}
                        onChange={(e) => updateSecteurCA(secteur.nom, parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Taux TVA effectif (%)</Label>
                      <Select
                        value={secteur.tauxTVA.toString()}
                        onValueChange={(v) => updateSecteurTVA(secteur.nom, parseFloat(v))}
                      >
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="2.6">2.6%</SelectItem>
                          <SelectItem value="3.8">3.8%</SelectItem>
                          <SelectItem value="8.1">8.1%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-800">CA total des secteurs :</span>
                  <span className="text-sm font-bold text-green-800">
                    {totalCASecteurs.toLocaleString('fr-CH')} CHF
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: CA standard (optional) */}
        <div>
          <h4 className="font-medium mb-3">2. CA standard (optionnel)</h4>
          <p className="text-sm text-gray-600 mb-3">
            Si vous avez du CA qui ne correspond à aucun secteur TDFN spécifique :
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">CA net 0%</Label>
              <Input type="number" value={formData.CA_0} onChange={(e) => handleInputChange('CA_0', e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-sm">CA net 2.6%</Label>
              <Input type="number" value={formData.CA_26} onChange={(e) => handleInputChange('CA_26', e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-sm">CA net 3.8%</Label>
              <Input type="number" value={formData.CA_38} onChange={(e) => handleInputChange('CA_38', e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-sm">CA net 8.1%</Label>
              <Input type="number" value={formData.CA_81} onChange={(e) => handleInputChange('CA_81', e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>

        {/* Section 3: Achats et dépenses */}
        <div>
          <h4 className="font-medium mb-3">3. Achats et dépenses</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-sm">Achats 2.6%</Label>
              <Input type="number" value={formData.achats_26} onChange={(e) => handleInputChange('achats_26', e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-sm">Achats 8.1%</Label>
              <Input type="number" value={formData.achats_81} onChange={(e) => handleInputChange('achats_81', e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Dépenses 2.6%</Label>
              <Input type="number" value={formData.depenses_26} onChange={(e) => handleInputChange('depenses_26', e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-sm">Dépenses 8.1%</Label>
              <Input type="number" value={formData.depenses_81} onChange={(e) => handleInputChange('depenses_81', e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>

        {/* Summary */}
        {totalCA > 0 && (
          <div className="bg-gray-50 border rounded p-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">CA total à analyser :</span>
              <span className="font-bold text-lg">{totalCA.toLocaleString('fr-CH')} CHF</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Secteurs: {totalCASecteurs.toLocaleString('fr-CH')} CHF •
              Standard: {totalCAStandard.toLocaleString('fr-CH')} CHF
            </div>
          </div>
        )}

        <Button onClick={handleCalculate} className="w-full" disabled={totalCA === 0 || isLoading}>
          {totalCA === 0
            ? "Saisissez votre CA pour calculer"
            : isLoading ? "Calcul en cours..." : "Calculer : Effective vs TDFN"
          }
        </Button>
      </CardContent>
    </Card>
  );
}
