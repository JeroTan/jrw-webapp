# Server Services

Application services orchestrate use cases across domain rules and repositories.

Keep provider access out of services unless it is injected through an adapter interface. Pure domain logic belongs under `src/domain/**`.
