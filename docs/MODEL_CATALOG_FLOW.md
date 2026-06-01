# Model Catalog Flow And Rationale

## Direct Answer

There is no `xCreateTaskRequest` table or class in this repository. I searched the codebase and found no `xCreateTaskRequest`, `CreateTaskRequest`, or `TaskRequest`.

The existing model catalog is the `ml_models` database table plus these backend files:

- `backend/migrations/001_initial.sql`: creates `ml_models`
- `backend/schemas/model.py`: API input/output schemas
- `backend/routers/models.py`: HTTP API routes
- `backend/services/ml_service.py`: business service for model catalog operations
- `backend/repositories/model_repo.py`: SQL access for `ml_models`

## Why `ml_models` Exists

`ml_models` is a model registry table. It exists so the platform can track machine learning model metadata across departments and processes.

It stores:

- model name
- department ID
- process ID
- dataset ID
- algorithm
- lifecycle status
- MLflow run ID
- metrics JSON
- created/updated timestamps

Business reason:

- dashboards need to know which model supports which department/process
- jobs need to reference a model by ID
- drift metrics need to attach to a model
- prediction endpoints need to verify model readiness
- MLflow run IDs need to be traceable from API/UI to experiment artifacts

## Flow Chain

### Create Model

```text
Frontend/API caller
  -> POST /api/v1/models
  -> routers.models.create_model
  -> schemas.model.ModelCreate validates request body
  -> services.ml_service.MLService.create_model
  -> repositories.model_repo.ModelRepository.create
  -> PostgreSQL table ml_models
  -> ModelRepository returns row dict
  -> MLService maps row to ModelResponse
  -> FastAPI returns JSON
```

### List Models

```text
Frontend/API caller
  -> GET /api/v1/models?offset=0&limit=50
  -> routers.models.list_models
  -> MLService.list_models
  -> ModelRepository.list_all + ModelRepository.count
  -> PostgreSQL ml_models
  -> PaginatedResponse[ModelSummary]
```

### Get Model By ID

```text
Frontend/API caller
  -> GET /api/v1/models/{model_id}
  -> routers.models.get_model
  -> MLService.get_model
  -> ModelRepository.get_by_id(model_id)
  -> returns ModelResponse or raises NotFoundError
```

### Predict By Model ID

```text
Frontend/API caller
  -> POST /api/v1/models/{model_id}/predict
  -> schemas.model.PredictRequest validates input_data
  -> MLService.predict(model_id, input_data)
  -> ModelRepository.get_by_id(model_id)
  -> service verifies status == ready
  -> service runs inference placeholder / future MLflow artifact
  -> PredictResponse
```

## Layer Responsibility

| Layer | File | Responsibility |
|---|---|---|
| Application/API | `backend/routers/models.py` | HTTP route, request/response binding, service delegation |
| Model/schema | `backend/schemas/model.py` | Pydantic input/output contracts |
| Service/business | `backend/services/ml_service.py` | business rules, model readiness validation, logging |
| Infrastructure/repository | `backend/repositories/model_repo.py` | SQL only |
| Database | `backend/migrations/001_initial.sql` | table, keys, indexes |

## Important Design Rule

The service layer should not run raw database operations directly. In this repo, `MLService` correctly calls `ModelRepository`; SQL is inside `ModelRepository`.

Static model/domain helpers are acceptable for pure business lookups, but persistence should remain in repositories.
