from asyncio import create_task
from contextlib import asynccontextmanager
from typing import Annotated
from datetime import datetime

from fastapi import FastAPI, status, HTTPException, Body, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.params import Depends
from pydantic import BaseModel, Field
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.websockets import WebSocket

import app.database as db_handler


# === MODELS ===
class User(BaseModel):
    email: str = Field(..., description="The email of the user", examples=["john.doe@acme.com"])


class Verification(User):
    verification_code: str = Field(..., description="The verification code", examples=["123456"])


class Comment(BaseModel):
    comment: str = Field(..., description="The comment", examples=["This is a comment"])


# === FASTAPI ===
@asynccontextmanager
async def lifespan(app: FastAPI):
    # INFO: Needs to set up environment variables before running the app, refer to README.md
    # Get the database connection
    await db_handler.get_database()

    # Start the database cleaner
    create_task(db_handler.clean_database())

    yield


app = FastAPI(lifespan=lifespan)

# TODO: Remove this before production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
async def root(request: Request) -> dict[str, str]:
    """
    Root endpoint, used to check if the service is running.
    """
    return {"message": "ok", "url": str(request.url)}


@app.post(
    "/token",
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
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "Internal server error",
            "content": {"application/json": {"example": {"message": "Internal server error: <error message>"}}},
        }})
async def login(
        user_data: Annotated[User, Body(
            title="User login details",
            description="Endpoint to login the user. Requires email."
        )]) -> dict[str, str]:
    """
    Logs in the user using the email, this allows the user to get an access accessToken to post comments as non-anonymous.
    Needs to be followed by the verify endpoint to verify the user.

    :param user_data:  User login data
    :return: {"message": "ok"} means the user has been placed in the verification queue
    """
    try:
        await db_handler.email_verification_queue(**user_data.model_dump())
        return {"message": "ok"}
    except ValueError as e:
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
            "content": {"application/json": {"example": {"message": "ok", "access_token": "<access accessToken>"}}},
        },
        status.HTTP_400_BAD_REQUEST: {
            "description": "Bad request",
            "content": {"application/json": {"example": {"message": "<error message>"}}},
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
    Verify the user using the email and verification code. If the verification is successful, return an access accessToken.
    This can be continued from register or login endpoint, and it will automatically detect and do the appropriate action.
    Such as if from register endpoint, it will create a new user and return an access accessToken. If from login endpoint, it will
    return a new access accessToken.

    :return: {"message": "ok", "access_token": "access accessToken"}
    """

    try:
        access_token = await db_handler.verify_email(**verification_data.model_dump())
        return {"message": "ok", "access_token": access_token}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Internal server error: {str(e)}")


async def validate_token(Bearer: str | None = Header(None)) -> dict[str, str]:
    """
    Validate the access accessToken and return the user information.

    :param Bearer: The access accessToken
    :return: {"email": "<email>", "username": "<username>", "color": "<color>", "initial": "<initial>"} if the user is logged in, otherwise {"email": "anonymous user", "username": "anonymous", "color": "#1d3557", "initial": "/"}
    """
    try:
        return await db_handler.validate_access_token(Bearer)
    except ValueError:
        return {"email": "anonymous user", "username": "Anonymous", "color": "#1d3557", "initial": "/"}
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
    If the access accessToken is provided and valid the user information will be returned, otherwise, it will return anonymous user.

    :param user: The user data from the access accessToken
    :return: {"message": "ok", "email": "<email>", "username": "<username>", "color": "<color>", "initial": "<initial>"} if the user is logged in, otherwise {"message": "ok", "email": "anonymous user", "username": "Anonymous", "color": "#1d3557", "initial": "/"}
    """
    return {"message": "ok", **user}


@app.put(
    "/user",
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
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "Internal server error",
            "content": {"application/json": {"example": {"message": "Internal server error: <error message>"}}},
        }})
async def change_username(new_username: str = "", user: dict[str, str] = Depends(validate_token)) -> dict[
    str, str]:
    """
    This endpoint is used to change the username of the logged-in user.

    :param new_username:  The new username
    :param user: The user data from the access accessToken
    :return: {"message": "ok"} if the username is successfully changed
    """
    if user["email"] == "":  # This means the user is not logged in, anonymous user
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide a valid access accessToken")

    try:
        await db_handler.change_username(user["email"], new_username)
        return {"message": "ok"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Internal server error: {str(e)}")


# === APP ENDPOINT ===
@app.post(
    "/comment/{location:path}",
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
        location,
        comment_data: Annotated[Comment, Body(
            title="Comment data",
            description="Endpoint to post a comment. Requires comment body."
        )],
        user: dict[str, str] = Depends(validate_token)) -> dict[str, str]:
    """
    Post a comment on the location. The comment will be posted on the specified location / comment section id (from a page, etc).
    If the access accessToken is provided and valid, the comment will be posted with the user information, otherwise, it will be posted as anonymous.

    :param location: The location of the comment
    :param comment_data: Comment data containing the comment to be posted
    :param user: The user data from the access accessToken, anonymous if accessToken is invalid or not provided
    :return: {"message": "ok"} if the comment is successfully posted
    """
    # Cut the text if it's too long
    comment_data.comment = comment_data.comment[:5000]

    try:
        await db_handler.post_comment(**user, location=location, comment=comment_data.comment)
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
                                                 "comments": "[{'id': 2, 'email': '', 'username': 'Anonymous', 'color': '#1d3557', 'initial': '/', 'comment': 'Comment', 'date': '1980-01-31', 'time': '01:23:45'}, {'id': 1, 'email': 'john.doe@example.com', 'username': 'John', 'color': '#1d3557', 'initial': 'JD', 'comment': 'Comment', 'date': '1980-01-31', 'time': '01:23:45'}}]"}}
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
        comment_per_page: int = 30,
        page: int = 1,
        latest_first: bool = True) -> dict[str, str]:
    """
    Get comments on the location. The comments will be returned based on the location and the page number.
    The comments will be sorted by the latest comment first.

    :param location: The location of the comment
    :param comment_per_page: The number of comments per page
    :param page: The page number
    :param latest_first: Sort the comments by the latest comment first (highest id first)
    :return: {"message": "ok", "comments": "[{'id': 1, '<email>': 'email', 'username': '<username>', 'color': '<color>', 'initial': '<initial>', 'comment': '<Comment>', 'date': '<date>', 'time': '<time>'}]"}
    """
    # Check if comment per page and page number is valid
    if comment_per_page < 1 or page < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid comment per page or page number")

    try:
        comments = await db_handler.get_comments(location=location, comment_per_page=comment_per_page, page=page, latest_first=latest_first)
        return {"message": "ok", "comments": str(comments)}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Internal server error: {str(e)}")


@app.websocket("/comment/{location:path}")
async def ws_latest_comment(location, websocket: WebSocket):
    """
    Websocket endpoint to get the latest comments on the location.
    The comments will be sent to the client in real-time.

    :param location: The location of the comment
    :param websocket: The websocket connection
    """
    await websocket.accept()

    try:
        await db_handler.get_latest_comments_ws(location, websocket)
    except Exception as e:
        print(f"ERROR:    {datetime.now()} - Websocket error: {str(e)}")
        await websocket.close()