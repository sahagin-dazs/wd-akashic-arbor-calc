.PHONY: up down prod logs api frontend tf-apply tf-plan

up:
	docker compose up -d --build akashic-arbor-dev wdtools-api azurite

prod:
	docker compose up -d --build akashic-arbor

down:
	docker compose down

logs:
	docker compose logs -f

api:
	docker compose up -d --build wdtools-api azurite

frontend:
	docker compose up -d --build akashic-arbor-dev

tf-plan:
	cd infra/terraform && ./tf.sh plan

tf-apply:
	cd infra/terraform && ./tf.sh apply
