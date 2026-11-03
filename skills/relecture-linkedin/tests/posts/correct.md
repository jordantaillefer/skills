Notre build CI prenait 14 minutes. Il en prend 4.

Le coupable n'était pas le code : c'était le cache.
À chaque PR, l'installation des dépendances repartait de zéro, parce que la clé de cache incluait la date du jour.

J'ai remplacé la date par le hash du lockfile.
Résultat : 9 builds sur 10 retrouvent leur cache.

Ce que j'en retiens :
une CI lente n'est presque jamais un problème de puissance.
C'est un problème de ce qu'on refait pour rien.

Avant d'acheter des runners plus gros, regardez ce que votre pipeline recalcule à chaque fois.
C'est souvent là que dorment les minutes.

#ci #devops #github #performance
