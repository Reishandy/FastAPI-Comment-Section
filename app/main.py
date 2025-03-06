from contextlib import asynccontextmanager
from typing import Annotated
from asyncio import create_task

from fastapi import FastAPI, status, HTTPException, Body, Header
from fastapi.params import Depends
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


class Verification(User):
    verification_code: str = Field(..., description="The verification code", examples=["123456"], min_length=6,
                                   max_length=6)


class Comment(BaseModel):
    location: str = Field(...,
                          description="Identifier of the location. this is where you want to put the comment in, for example if you want to comment on a page, this can be the page url",
                          examples=["example.com/page1"])
    comment: str = Field(..., description="The comment", examples=["This is a comment"])


# === FASTAPI ===
@asynccontextmanager
async def lifespan(app: FastAPI):
    # INFO: Needs to set up environment variables before running the app, refer to README.md
    # Get the database connection
    await db_handler.get_database()

    # Start the access token cleanup task
    create_task(db_handler.remove_expired_tokens())

    yield


app = FastAPI(lifespan=lifespan)


# Custom exception handler to change {detail} to {message} for more unified response
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail},
    )


# === AUTHENTICATION ENDPOINT ===
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
async def verify_email(
        verification_data: Annotated[Verification, Body(
            title="User Verification details",
            description="Endpoint to verify the user. Requires email and verification code."
        )]) -> dict[str, str]:
    """
    Verify the user using the email and verification code. If the verification is successful, return an access token.
    This can be continued from register or login endpoint, and it will automatically detect and do the appropriate action.
    Such as if from register endpoint, it will create a new user and return an access token. If from login endpoint, it will
    return a new access token.

    :return: {"message": "ok", "access_token": "access token"}
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


async def validate_token(Bearer: str | None = Header(None)) -> dict[str, str]:
    """
    Validate the access token and return the user information.

    :param Bearer: The access token
    :return: {"email": "<email>", "username": "<username>"} or {"email": "", "username": "anonymous"} if the token is invalid or not provided
    """
    try:
        return await db_handler.validate_access_token(Bearer)
    except ValueError:
        return {"email": "", "username": "anonymous"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Internal server error: {str(e)}")


@app.get(
    "/user",
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_200_OK: {
            "description": "Successful response",
            "content": {
                "application/json": {"example": {"message": "ok", "email": "<email>", "username": "<username>"}}},
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "Internal server error",
            "content": {"application/json": {"example": {"message": "Internal server error: <error message>"}}},
        }})
async def get_user(user: dict[str, str] = Depends(validate_token)) -> dict[str, str]:
    """
    This endpoint is used to get the user information.
    If the access token is provided and valid the user information will be returned, otherwise, it will return anonymous user.

    :param user: The user data from the access token
    :return: {"message": "ok", "email": "<email>", "username": "<username>"} or {"message": "ok", "email": "", "username": "anonymous"}
    """
    return {"message": "ok", **user}


# === APP ENDPOINT ===
@app.post(
    "/comment",
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_201_CREATED: {
            "description": "Data created",
            "content": {"application/json": {"example": {"message": "ok"}}},
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "Internal server error",
            "content": {"application/json": {"example": {"message": "Internal server error: <error message>"}}},
        }})
async def comment(
        comment_data: Annotated[Comment, Body(
            title="Comment details",
            description="Endpoint to comment on a location. Requires location and comment."
        )],
        user: dict[str, str] = Depends(validate_token)) -> dict[str, str]:
    """
    Post a comment on the location. The comment will be posted on the specified location / comment section id (from a page, etc).
    If the access token is provided and valid, the comment will be posted with the user information, otherwise, it will be posted as anonymous.

    :param comment_data: Comment data containing of location and comment
    :param user: The user data from the access token, anonymous if token is invalid or not provided
    :return: {"message": "ok"} if the comment is successfully posted
    """
    try:
        await db_handler.post_comment(**comment_data.model_dump(), **user)
        return {"message": "ok"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Internal server error: {str(e)}")


@app.get(
    "/comment/{location:path}",
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_200_OK: {
            "description": "Successful response",
            "content": {
                "application/json": {"example": {"message": "ok",
                                                 "comments": "[{'id': 1, 'email': '', 'username': 'anonymous', 'comment': 'Comment', 'date': '1980-01-31', 'time': '01:23:45'}, {'id': 2, 'email': 'john.doe@example.com', 'username': 'John', 'comment': 'Comment', 'date': '1980-01-31', 'time': '01:23:45'}}]"}}
            },
        },
        status.HTTP_400_BAD_REQUEST: {
            "description": "Bad request",
            "content": {"application/json": {"example": {"message": "Invalid comment per page or page number"}}},
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "Internal server error",
            "content": {"application/json": {"example": {"message": "Internal server error: <error message>"}}},
        }})
async def get_comments(
        location,
        comment_per_page: int = 10,
        page_number: int = 1) -> dict[str, str]:
    """
    Get comments on the location. The comments will be returned based on the location and the page number.
    The comments will be sorted by the latest comment first.

    :param location: The location of the comment
    :param comment_per_page: The number of comments per page
    :param page_number: The page number
    :return: {"message": "ok", "comments": "[{'id': 1, 'email': 'email', 'username': 'username', 'comment': 'Comment', 'date': 'date', 'time': 'time'}]"}
    """
    # Check if comment per page and page number is valid
    if comment_per_page < 1 or page_number < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid comment per page or page number")

    # Calculate from and to id
    from_id = (page_number - 1) * comment_per_page
    to_id = from_id + comment_per_page
    try:
        comments = await db_handler.get_comments(location=location, from_id=from_id, to_id=to_id)
        return {"message": "ok", "comments": str(comments)}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Internal server error: {str(e)}")
