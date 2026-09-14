# Cómo se construyó este laboratorio

Este documento conecta el código con las ideas de system design. La meta no es
memorizar Docker, Redis o OpenTelemetry, sino entender qué problema resuelve
cada pieza y qué coste introduce.

En el studio, el modo **Lab QA** recorre estos seis pasos sobre URL Shortener.
Haz uno, predice, observa, y solo entonces cambia la siguiente variable.

## Pase guiado de QA

1. **Escribe el contrato** en Practicar (`Create a short link`). El navegador
   inspecciona fuente; no ejecuta el snippet.
2. **Pega FastAPI.** `POST /links` con `{ "url": "https://example.com/article" }`
   (o `/docs`). Lee `201 { code, url }` y `X-Request-Id`. Sigue `GET /r/:code`.
3. **El mismo body contra Rails.** Si el contrato es compartido, el framework
   es un detalle. Un body nested `{ link: { url } }` sería una fuga.
4. **Lee la traza en Jaeger** (Compose local: servicio
   `url-shortener-fastapi` o `url-shortener-rails`). Render no exporta OTLP:
   production-shaped, sin collector. El primer GET debe mostrar miss de Redis
   + SQL; el segundo, solo Redis.
5. **Apaga Redis** solo en local (`docker compose stop redis` o
   `LAB_FAULTS=1 LAB_ENV=lab LAB_FAULT_REDIS=1`). El 302 debe seguir saliendo
   desde PostgreSQL. Nunca actives fallos en Render.
6. **Compara una medición.** Bench GET contra `/health` y contra un `/r/:code`
   caliente vs frío. Stress en el studio es hipótesis; el bench es un host.
   No elijas un ganador.

## El recorrido de una petición


```text
cliente
  -> FastAPI o Rails
     -> request id + logs + tracing
     -> Redis (cache de lecturas)
     -> PostgreSQL (fuente de verdad)
     -> respuesta HTTP
```

Los dos backends implementan el mismo contrato en
[`url-shortener/CONTRACT.md`](url-shortener/CONTRACT.md). Eso permite comparar
frameworks sin cambiar simultáneamente el problema de negocio.

## Qué hace cada tecnología

### PostgreSQL: persistencia

PostgreSQL guarda la relación `code -> url`. Es la fuente de verdad: si Redis
se reinicia, los enlaces no desaparecen. El tradeoff es que una consulta a una
base de datos es más costosa que leer memoria, y por eso la ruta de redirección
usa caché.

### Redis: aceleración, no autoridad

Redis guarda temporalmente códigos consultados recientemente. El patrón es
cache-aside:

1. Buscar el código en Redis.
2. Si existe, responder desde caché.
3. Si no existe, leer PostgreSQL.
4. Guardar el resultado en Redis y responder.

Aquí Redis es *fail-open*: si está caído, la aplicación continúa usando
PostgreSQL. Se pierde rendimiento, pero no disponibilidad funcional. La
decisión cambia si Redis fuera la fuente de sesiones, colas o locks críticos.

### Docker Compose: reproducibilidad local

Compose inicia FastAPI, Rails, PostgreSQL, Redis y Jaeger con una sola orden.
No es una arquitectura de producción por sí misma; es un entorno reproducible
para experimentar con dependencias reales.

### Solid Queue: trabajo fuera de la petición

Rails tiene una base de datos separada para Solid Queue. Eso enseña una
distinción importante: los datos del producto y los trabajos pendientes tienen
ciclos de vida, índices y cargas distintas. En este lab el worker corre junto
a Puma para simplificar el aprendizaje; en producción normalmente se separan
los procesos para escalar web y workers independientemente.

### OpenTelemetry y Jaeger: observar el recorrido

OpenTelemetry crea spans durante una petición. Jaeger recibe esos spans y los
muestra como una traza. Una traza responde preguntas que un log aislado no
responde bien: cuánto tardó Redis, cuánto tardó PostgreSQL y dónde apareció la
latencia.

La observabilidad no acelera la aplicación. Añade coste de CPU, red y
almacenamiento, pero reduce el tiempo necesario para diagnosticar problemas.

## Por qué existen dos implementaciones

FastAPI y Rails reciben el mismo `POST /links` y exponen el mismo `GET /health`.
El benchmark sirve para aprender a medir, no para declarar un ganador: los
resultados dependen de Docker Desktop, configuración, caché, conexiones y
carga. La comparación útil es estudiar qué decisiones son del framework y
cuáles son de la arquitectura compartida.

## Ejercicio recomendado

Haz estas preguntas después de cada cambio:

- ¿Cuál es la fuente de verdad?
- ¿Qué ocurre si Redis deja de responder?
- ¿Qué ocurre si PostgreSQL deja de responder?
- ¿Qué parte está dentro de la petición y cuál podría ir a una cola?
- ¿Dónde puedo observar la latencia?
- ¿Qué componente escalaría primero si hubiera diez veces más tráfico?

Después modifica una sola variable: desactiva Redis, cambia el perfil de carga
o inyecta un fallo de laboratorio. Predice el resultado, ejecútalo y compáralo
con los logs, el benchmark y Jaeger.
