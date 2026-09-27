-- Mise en service de la vérification d'adresse e-mail : les comptes créés avant
-- elle n'ont jamais reçu de lien et seraient bloqués sur « Vérifiez votre adresse
-- e-mail ». On les considère comme vérifiés. Migration de données uniquement
-- (aucun changement de schéma). Jouée une seule fois (suivie dans d1_migrations) :
-- les comptes créés ensuite confirment leur adresse par le lien reçu par e-mail.
UPDATE `user` SET `email_verified` = 1 WHERE `email_verified` = 0;
