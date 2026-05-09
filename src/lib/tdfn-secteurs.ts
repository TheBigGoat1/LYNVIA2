// TDFN: liste brute officielle (copier-coller intégral AFC/ESTV)
// Format attendu par ligne : "<Libellé>\t<Pourcentage>"
export const TDFN_RAW = `
Activités de loisirs de plein air ou à l'intérieur, offre d'–, sauf indication contraire dans la présente liste	3,7 %
Affinage de surfaces, sauf indication contraire dans la présente liste	4,5 %
Affinage et traitement de surfaces de pièces d'horlogerie et de bijoux	6,2 %
Agences postales: rémunération de la part de la Poste Suisse	6,2 %
Aide de ménage	6,2 %
Aiguisage ou affûtage d'outils	4,5 %
Aménagement du territoire/urbanisme, bureau d'–	6,2 %
Aménagement intérieur, tels que meubles, tapis, lampes: commerce	2,1 %
Animateur ou modérateur	6,2 %
Animaux, à l'exception du bétail: dressage, éducation, entraînement	6,2 %
Animaux, articles pour –: commerce de biens et d'animaux imposables au taux normal	2,1 %
Animaux, articles pour –: commerce de biens imposables au taux réduit	0,1 %
Animaux, uniquement bétail: dressage, éducation, entraînement	1,3 %
Animaux: incinération et ensevelissement	3,7 %
Animaux: pension, refuge, hôtel	5,3 %
Animaux: salon de toilettage	5,3 %
Antennes, construction d'–	4,5 %
Antiquités: commerce	3,0 %
Appareils à moteurs: commerce	2,1 %
Appareils auditifs: vente avec service; conseils	3,7 %
Appareils ménagers: commerce	2,1 %
Appareils, construction d'–	3,7 %
Appartements de vacances: location	2,1 %
Arbres, buissons: soins et taille	5,3 %
Architecte d'intérieur	6,2 %
Architecte, bureau d'–: y compris la direction de chantiers	6,2 %
Armes: commerce	2,1 %
Articles pour fumeurs: commerce	1,3 %
Articles pour fumeurs: commissions	6,8 %
Articles sanitaires: commerce de déambulateurs et de béquilles, de fauteuils roulants, d'appareils de levage pour personnes handicapées, de bandages, etc.	2,1 %
Artisanat d'art, sauf indication contraire dans la présente liste	5,3 %
Ascenseurs: service et entretien	5,3 %
Assainissement spécialisé, tel que décontamination ou désamiantage	5,3 %
Autobus et autocars, entreprise d'–	4,5 %
Automates de jeux d'adresse et automates à musique, exploitation d'–	3,7 %
Automobiles: atelier d'électricité	3,7 %
Automobiles: atelier de réparations	3,7 %
Automobiles: carrosserie et tôlerie	4,5 %
Automobiles: commerce de voitures neuves	0,6 %
Automobiles: peinture	4,5 %
Automobiles: récupération et démantèlement	4,5 %
Automobiles: station de lavage	3,7 %
Automobiles et poids lourds: commerce de véhicules d'occasion	0,6 %
Aviation, entreprise d'–: vols en avion, hélicoptère, ballon, parapente, etc.	3,0 %
Avions: entretien	3,0 %
Avocats, étude d'–	6,2 %
Bar: prestations imposables au taux normal	5,3 %
Bateaux et accessoires: commerce	1,3 %
Bateaux: construction; réparation; hivernage; sortir de l'eau et mettre à l'eau	3,7 %
Bateaux: location de places d'amarrage	3,7 %
Bâtiments, séchage de –	4,5 %
Bétail: commerce	0,6 %
Bibliothèque: prestations imposables au taux normal	3,7 %
Bibliothèque: prêt de livres	0,6 %
Biens immobiliers: administration	6,2 %
Biens immobiliers: entremise dans la vente	6,2 %
Biens imposables au taux normal et que la personne assujettie a ramassé, trouvé ou obtenu sans contrepartie: livraison	6,8 %
Biens imposables au taux réduit et que la personne assujettie a ramassé, cueilli, capturé, chassé, trouvé ou obtenu sans contrepartie: livraison	1,3 %
Bijouterie, joaillerie et horlogerie: commerce	2,1 %
Bijoux: fabrication	4,5 %
Billard, centre de –	5,3 %
Blanchisserie et repassage	5,3 %
Bois de la propre forêt (production naturelle): vente	3,0 %
Bois: commerce	2,1 %
Boissons alcooliques: commerce de boissons acquises avec TVA transférée	1,3 %
Boissons alcooliques: commerce de boissons acquises sans TVA transférée	6,8 %
Boissons imposables au taux réduit: commerce	0,6 %
Boîte de nuit: prestations imposables au taux normal	5,3 %
Boucher: travail à façon; boucher à domicile	1,3 %
Boucherie, charcuterie: vente de viande et de produits carnés	0,1 %
Boulangerie, pâtisserie, confiserie: commerce de biens imposables au taux normal	2,1 %
Boulangerie, pâtisserie, confiserie: commerce de biens imposables au taux réduit	0,6 %
Boulangerie, pâtisserie, confiserie: fabrication	0,1 %
Boutique de seconde main: commerce	3,0 %
Brasserie: brassage de bière avec alcool	3,7 %
Broderie	3,7 %
Brûleur à gaz et à mazout: service, y compris installation	4,5 %
Bureau comptable	6,2 %
Calibrage de biens en tout genre	6,2 %
Camping: prestations de restauration	5,3 %
Camping: toute activité en relation avec le camping, à l'exception des prestations de restauration	2,1 %
Canalisations: inspections avec une caméra vidéo	4,5 %
Canalisations: nettoyage et vidange	4,5 %
Capitonnage, rembourrage	3,7 %
Carburant: vente en son propre nom	0,1 %
Carburant: vente sur la base de commissions	6,2 %
Carottage	4,5 %
Carreleur: fourniture avec pose	4,5 %
Carreleur: travail à façon	6,8 %
Carrière	5,3 %
Cartographie	5,3 %
Centrales d'alarme: toutes les recettes	6,2 %
Centre d'appels	6,2 %
Chapes: pose	3,7 %
Charpenterie	3,7 %
Chauffage et ventilation: fourniture avec montage	3,7 %
Chaussures: commerce	2,1 %
Cheminées, poêles: fourniture avec pose	3,0 %
Chevaux: commerce	0,6 %
Chevaux: pension	4,5 %
Chiens: élevage	5,3 %
Cidrerie: travail à façon pour cidre doux	1,3 %
Citernes: révision	5,3 %
Climatisation et ventilation: service, nettoyage	5,3 %
Clôtures: fabrication; fourniture avec montage; réparations	3,7 %
Coiffure, salon de –: prestations de service	5,3 %
Commerce de biens imposables au taux normal	2,1 %
Commerce de biens imposables au taux réduit	0,6 %
Commerce de prestations de services imposables au taux normal	2,1 %
Composition et reproduction graphique	5,3 %
Conciergerie	6,2 %
Conseiller d'entreprises	6,2 %
Conseils, sauf indication contraire	6,2 %
Construction de bâtiments/génie civil	4,5 %
Construction métallique	3,7 %
Copeaux de bois imposables au taux normal: commerce	2,1 %
Copeaux de bois imposables au taux réduit: commerce	0,6 %
Corderie	3,0 %
Cordonnerie: fabrication et réparations de chaussures; copies de clés	3,7 %
Cosmétiques, commerce de produits –	2,1 %
Cosmétiques, fabrication de produits –	3,7 %
Costumes, location de –	5,3 %
Couverture de toit	3,7 %
Cuisines, construction de –: fourniture avec montage	3,7 %
Décapage, atelier de –	6,2 %
Déchets: traitement, élimination	3,0 %
Décolletage: tourner, fraiser, forer	5,3 %
Décoration d'intérieur	3,7 %
Décoration de vitrines, d'espaces	4,5 %
Déménagement	5,3 %
Démolition	4,5 %
Denrées alimentaires: commerce	0,6 %
Denrées alimentaires: fabrication	0,1 %
Dépannage, service de –	4,5 %
Détectives, agence de –	6,2 %
Distillerie pour le compte de tiers	5,3 %
Distillerie, sans distillation pour le compte de tiers	3,7 %
Données: vente ou mise à disposition	6,2 %
Dorure, travaux de –	4,5 %
Droguerie: commerce de biens imposables au taux normal	2,1 %
Droguerie: commerce de biens imposables au taux réduit	0,6 %
Droits, licences, brevets: commerce	2,1 %
Droits: recettes provenant de la cession ou du transfert	5,3 %
Eau, installations pour le traitement: fourniture avec montage	3,7 %
Échafaudages: location avec montage	5,3 %
Édition de biens imposables au taux normal	3,7 %
Édition de journaux: prestations imposables au taux réduit	0,1 %
Édition de journaux: recettes provenant des annonces	4,5 %
Édition de livres: prestations imposables au taux réduit	0,1 %
Édition de revues: prestations imposables au taux réduit	0,1 %
Édition de revues: recettes provenant des annonces	4,5 %
Électronique: fabrication de composants	3,7 %
Emballage, prestations d'–	5,3 %
Encadrements	4,5 %
Énergie: livraison d'électricité, gaz ou chaleur	3,0 %
Engrais: commerce	0,1 %
Engrais: production	0,1 %
Entraînement du corps: aquagym, aérobic, Pilates, zumba, yoga	5,3 %
Entremise dans la location ou la vente de biens	6,2 %
Entremise de services	6,2 %
Entreprise générale du bâtiment	3,7 %
Établissement érotique/sauna érotique	6,2 %
Étanchéification en tout genre	4,5 %
Excavation	4,5 %
Exploitation agricole: vente de produits de sa propre production	0,1 %
Exploitation maraîchère: vente de produits de sa propre production	0,1 %
Extincteurs: livraison et entretien	4,5 %
Fabrication de biens imposables au taux normal	4,5 %
Fabrication de biens imposables au taux réduit	0,1 %
Ferblanterie	3,7 %
Ferraillage: tâcheron	6,8 %
Fiduciaire	6,2 %
Films et vidéos: production	4,5 %
Fitness, centre de –	5,3 %
Fleurs, magasin de –: livraison de biens imposables au taux normal	2,1 %
Fleurs, magasin de –: livraison de biens imposables au taux réduit	0,6 %
Fonderie	4,5 %
Forage	4,5 %
Forestiers, travaux –	4,5 %
Forgeron	3,7 %
Fourrages: commerce	0,1 %
Fourrages: production	0,1 %
Fourrures: commerce	3,0 %
Fourrures: fabrication	3,7 %
Frigorifiques, systèmes – et climatisations: fourniture avec montage	3,7 %
Fromagerie, laiterie: commerce imposable au taux normal	2,1 %
Fromagerie, laiterie: commerce imposable au taux réduit	0,6 %
Fromagerie, laiterie: fabrication	0,1 %
Galerie d'art: commerce en son propre nom	3,0 %
Galerie d'art: vente au nom et pour le compte d'un tiers	6,2 %
Galvanisation, atelier de –	4,5 %
Garages, portes de –: livraison avec montage	3,0 %
Gaz en bouteilles: commerce	2,1 %
Géomètres, bureau de –	6,2 %
Graphisme, atelier de –	6,2 %
Gravière et entreprise de fabrication de béton	3,0 %
Gravière: extraction de pierres, caillasse, gravier ou sable	3,0 %
Gravure, atelier de –: commerce de biens	3,0 %
Gravure, atelier de –: travaux de gravure	5,3 %
Hébergement dans l'hôtellerie et la parahôtellerie	2,1 %
Horlogerie: réparations	5,3 %
Horticulture: vente de produits de sa propre production	0,1 %
Hôtel: prestations imposables au taux normal	5,3 %
Hôtel: prestations imposables au taux spécial pour l'hébergement	2,1 %
Imprimerie: prestations imposables au taux normal	4,5 %
Imprimerie: prestations imposables au taux réduit	0,1 %
Informatique: prestations de services informatiques	6,2 %
Ingénierie et études techniques, bureau d'–	6,2 %
Ingénieurs, bureau d'–	6,2 %
Installations électriques à courant faible, contrôle des –	6,2 %
Installations électriques	4,5 %
Installations sanitaires: fourniture avec montage	3,7 %
Installations sportives: piscine, patinoire, minigolf, karting	3,7 %
Installations techniques pour manifestations: location avec installation	3,7 %
Institut de beauté: prestations de service	5,3 %
Internet: fournisseurs d'accès	2,1 %
Internet: prestations de service (création de sites, hébergement, etc.)	6,2 %
Interprète	6,8 %
Isolation	4,5 %
Isolation de câbles, de lignes ou de conduites	4,5 %
Jardins, entretien de –	5,3 %
Journalisme	6,2 %
Kiosque: commerce	0,6 %
Kiosque: prestations de restauration	5,3 %
Kiosque: recettes provenant des commissions et de l'activité d'agence	6,8 %
Laboratoire photographique	3,7 %
Laboratoire: analyses d'objets sur mandat	5,3 %
Légumes: commerce	0,6 %
Licences, brevets, recettes provenant de –	5,3 %
Livres, neufs ou usagés: commerce	0,6 %
Location de biens imposables au taux normal	3,7 %
Location de biens imposables au taux réduit	1,3 %
Location de services, mise à disposition de personnel	6,8 %
Machines agricoles: commerce	0,6 %
Machines agricoles: location	3,7 %
Machines agricoles: travaux de réparation et service	3,7 %
Machines de bureau: commerce	2,1 %
Machines et outils de chantier: commerce	1,3 %
Machines: construction	3,7 %
Machines: location avec ou sans opérateur	3,7 %
Maçonnerie	4,5 %
Maçonnerie: travail à la tâche	6,8 %
Manège et écurie pour chevaux	4,5 %
Marchandises usagées: commerce	3,0 %
Maroquinerie, articles de voyage: commerce	2,1 %
Massages: sans massages érotiques	6,2 %
Matériaux de construction: commerce	2,1 %
Matériel électronique de loisir: commerce	1,3 %
Matières synthétiques: fabrication	3,7 %
Mazout: commerce	0,1 %
Mécanique, atelier de –: fabrication	4,5 %
Menuiserie	3,7 %
Montres et pièces détachées: assemblage	6,2 %
Moteurs: commerce	2,1 %
Moules: fabrication	4,5 %
Moulin	0,1 %
Musique, instruments de –: commerce	2,1 %
Musique, instruments de –: fabrication, réparation, accordage	4,5 %
Naturopathes, cabinet de –: traitements	6,2 %
Neige, déblaiement de la –	4,5 %
Nettoyage chimique	5,3 %
Nettoyage de bâtiments	6,2 %
Nettoyage de tapis et de sièges rembourrés	5,3 %
Notaires, étude de –	6,2 %
Numérisation de disques, films, imprimés, plans	4,5 %
Objets d'art: commerce en son propre nom	3,0 %
Objets d'art: vente au nom et pour le compte d'un tiers	6,2 %
Onglerie: prestations de service	5,3 %
Opticien	3,7 %
Ordinateurs, matériel informatique et logiciels: commerce	1,3 %
Orthodontie, cabinet d'–: fabrication	5,3 %
Orthopédiques, articles –: commerce	2,1 %
Orthopédiques, articles –: fabrication	4,5 %
Outils: fabrication	4,5 %
Ouvrage sur des biens imposables au taux normal	6,2 %
Ouvrage sur des biens imposables au taux réduit	1,3 %
Peintre et tapissier-peintre	5,3 %
Personnel temporaire, placement de –	6,8 %
Pharmacie: commerce de biens imposables au taux normal	2,1 %
Pharmacie: commerce de biens imposables au taux réduit	0,6 %
Photographe	5,3 %
Plâtrier et gypsier	5,3 %
Prestations de services financiers	6,2 %
Publicité, agence de –	6,2 %
Ramonage	6,2 %
Recouvrement, bureau de –	6,2 %
Restaurant: prestations imposables au taux normal	5,3 %
Sécurité, prestations de –	6,2 %
Serrurerie	3,7 %
Taxis, entreprise de –	5,3 %
Technicien dentiste	5,3 %
Textiles: commerce	2,1 %
Traduction, bureau de –	6,8 %
Transport de biens	5,3 %
Vêtements: commerce	3,0 %
Vétérinaire: traitement de petits animaux	5,3 %
Voyages, organisateur de –	2,1 %
`.trim();

export type TdfnEntry = {
  branche: string;
  tdfn: number;
};

/** Parse the raw TDFN list into an array of {branche, tdfn} entries */
export function getTdfnList(): TdfnEntry[] {
  return TDFN_RAW.split('\n').map((line) => {
    const parts = line.split('\t');
    const branche = (parts[0] || '').trim();
    const pctRaw = (parts[1] || '').replace('%', '').replace(',', '.').trim();
    const num = Number(pctRaw);
    return {
      branche,
      tdfn: isNaN(num) ? 0 : num / 100,
    };
  }).filter(entry => entry.branche && entry.tdfn > 0);
}
