---
name: project_abonnement
description: Logique du module abonnement — frais de mise en place, plans, devis, super admin vs client
metadata:
  type: project
---

## Frais de mise en place (FraisSetup)

Les frais (ex. Ouverture de compte, Formation avancée) sont stockés dans `t_frais_setup` et référencés en JSONB (`frais_setup_detail`) sur l'entité `Abonnement`.

**Règle** : pour le super admin, les frais sont TOUJOURS inclus (nouvelle souscription ET renouvellement). Pour un client normal, ils ne s'appliquent qu'au 1er abonnement payant (`estPremierAbonnement()`).

**Implémentation** :
- `calculerDevisRenouvellement(structureId, plan, forceFrais = false)` : si `forceFrais = true`, bypass `estPremierAbonnement()` et inclut toujours les frais
- Contrôleur devis GET `/:structureId/devis/:plan` : lit `req.user.is_super_admin`, passe `forceFrais = isSuperAdmin`
- `souscrire(dto, isSuperAdmin = false)` : idem, passe `isSuperAdmin` comme `forceFrais`

## Ordre des plans tarifaires

L'ordre DB (`id ASC`) donne un ordre alphabétique incorrect (`1_an → 1_mois → 3_mois → 6_mois`).

**Fix** : constante `PLAN_ORDER = ['1_mois', '3_mois', '6_mois', '1_an']` et helper `sortByPlan()` en mémoire, appliqués dans `getPlans()`, `getCategories()`, `getTarifsCategorie()`.

## Remise auto dans souscrire()

Si `dto.montant < devis.total` sans remise explicite, le service déduit automatiquement une `remise_detail` de type `montant` pour garder la cohérence de la facture (sinon `montantPlanBase` devenait négatif dans `getFacture()`).

## Extension vs nouvelle souscription (super admin)

Dans `souscrire()`, le code vérifie si la structure a déjà un abonnement `actif` avec `date_fin > maintenant` pour décider de la `date_debut` (extension = concaténation après la date de fin courante). `isExtension` est déterminé AVANT le calcul du devis pour éviter toute incohérence.

## Frontend (ek-abonnements.component)

- `isRenewal` flag : `true` quand on clique "Renouveler" sur un abonnement existant
- `fetchDevis()` : charge le devis et initialise `form.montant = devis.total` (inclut frais pour super admin)
- Template : `@if (devis.frais_setup?.length > 0)` affiche la section frais — sans filtre `!isRenewal` (super admin voit les frais partout)
