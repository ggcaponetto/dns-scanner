# kubernetes cheat sheet

Depolyment:

``kubectl.exe apply -f .\kubernetes\controllers\dns-scanner-deployment.yaml``

Scaling:

``kubectl.exe scale deployment/dns-scanner-deployment --replicas=5``

Delete deployment:

``kubectl.exe delete deployment/dns-scanner-deployment``
