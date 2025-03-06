from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, status, HTTPException, Body
from pydantic import BaseModel, Field, EmailStr
from starlette.requests import Request
from starlette.responses import JSONResponse

import app.database as db_handler


# === MODELS ===
class User(BaseModel):
    email: str = Field(..., description="The email of the user", examples=["john.doe@acme.com"])


class Registration(User):
    username: str = Field(..., description="The username of the user", examples=["user1", "user2"], min_length=3,
                          max_length=20)


class Verification(BaseModel):
    email: str = Field(..., description="The email of the user", examples=["john.doe@acme.com"])
    verification_code: str = Field(..., description="The verification code", examples=["123456"], min_length=6,
                                   max_length=6)


# === FASTAPI ===
@asynccontextmanager
async def lifespan(app: FastAPI):
    # INFO: Needs to set up environment variables before running the app, refer to README.md
    # Get the database connection
    await db_handler.get_database()

    yield


app = FastAPI(lifespan=lifespan)


# Custom exception handler to change {detail} to {message}
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail},
    )


# === ENDPOINT ===
@app.get(
    "/",
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_200_OK: {
            "description": "Successful response",
            "content": {"application/json": {"example": {"message": "ok"}}},
        }})
async def root() -> dict[str, str]:
    """
    Root endpoint, used to check if the service is running.
    """
    return {"message": "ok"}


@app.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {
            "description": "Data created",
            "content": {"application/json": {"example": {"message": "ok"}}},
        },
        status.HTTP_400_BAD_REQUEST: {
            "description": "Bad request",
            "content": {"application/json": {"example": {"message": "User already exists"}}},
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "Internal server error",
            "content": {"application/json": {"example": {"message": "Internal server error: <error message>"}}},
        }})
async def register(
        registration_data: Annotated[Registration, Body(
            title="User Registration details",
            description="Endpoint to register a new user. Requires unused email, name, and password."
        )]) -> dict[str, str]:
    """
    Register a new user with the email and username. The user will be placed in the verification queue.
    Then go to /verify endpoint.

    :param registration_data: User registration data
    :return: {"message": "ok"} means the user has been placed in the verification queue
    """
    try:
        await db_handler.email_verification_queue(**registration_data.model_dump())
        return {"message": "ok"}
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Internal server error: {str(e)}")


@app.post(
    "/login",
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_200_OK: {
            "description": "Successful response",
            "content": {"application/json": {"example": {"message": "ok"}}},
        },
        status.HTTP_400_BAD_REQUEST: {
            "description": "Bad request",
            "content": {"application/json": {"example": {"message": "<error message>"}}},
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Not found",
            "content": {"application/json": {"example": {"message": "User not found"}}},
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "Internal server error",
            "content": {"application/json": {"example": {"message": "Internal server error: <error message>"}}},
        }})
async def login(
        user_data: Annotated[User, Body(
            title="User Login details",
            description="Endpoint to login a user. Requires email and password."
        )]) -> dict[str, str]:
    """
    Login the user using the email. The user will be placed in the verification queue.
    Then go to /verify endpoint.

    :param user_data:  User login data
    :return: {"message": "ok"} means the user has been placed in the verification queue
    """
    try:
        await db_handler.email_verification_queue(**user_data.model_dump())
        return {"message": "ok"}
    except ValueError as e:
        if str(e) == "404":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Internal server error: {str(e)}")


@app.post(
    "/verify",
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_200_OK: {
            "description": "Successful response",
            "content": {"application/json": {"example": {"message": "ok", "access_token": "<access token>"}}},
        },
        status.HTTP_400_BAD_REQUEST: {
            "description": "Bad request",
            "content": {"application/json": {"example": {"message": "<error message>"}}},
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Not found",
            "content": {"application/json": {"example": {"message": "User not found"}}},
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "Internal server error",
            "content": {"application/json": {"example": {"message": "Internal server error: <error message>"}}},
        }})
async def verify(
        verification_data: Annotated[Verification, Body(
            title="User Verification details",
            description="Endpoint to verify the user. Requires email and verification code."
        )]) -> dict[str, str]:
    """
    Verify the user using the email and verification code. If the verification is successful, return an access token.
    This can be continued from register or login endpoint, and it will automatically detect and do the appropriate action.
    Such as if from register endpoint, it will create a new user and return an access token. If from login endpoint, it will
    return a new access token.

    :return: {"message": "ok", "access_token": "<access token>"}
    """

    try:
        access_token = await db_handler.verify_email(**verification_data.model_dump())
        return {"message": "ok", "access_token": access_token}
    except ValueError as e:
        if str(e) == "404":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Internal server error: {str(e)}")
