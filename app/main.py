from asyncio import create_task
from contextlib import asynccontextmanager
from typing import Annotated
from datetime import datetime

from fastapi import FastAPI, status, HTTPException, Body, Header
from fastapi.params import Depends
from pydantic import BaseModel, Field
from starlette.requests import Request
from starlette.responses import JSONResponse, FileResponse, HTMLResponse
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
    response_class=HTMLResponse,
    responses={
        status.HTTP_200_OK: {
            "description": "Successful response",
            "content": {"text/html": {"example": "<div>Comment Section</div>"}},
        }})
async def root(request: Request) -> HTMLResponse:
    """
    Returns the div html embed code for the comment section

    Usage:
    ```html
    <iframe src="https://<api_url>/" width="100%" height="100%" style="border: 0"></iframe>
    ```
    """
    forwarded_proto = request.headers.get("X-Forwarded-Proto", "http")
    url = request.url._url.replace("http://", f"{forwarded_proto}://")

    comment_section_html = f"""<div style="width:100%;height:100%;background-color:#f0f0f0;display:flex;flex-direction:column;border-radius:8px;box-shadow:0 2px 5px rgba(0,0,0,.1);position:relative"id=comment-section> <span id=api-url style=visibility:hidden;height:0>{url}</span> <div style="position:absolute;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,.5);justify-content:center;align-items:center;z-index:1000;display:none;opacity:0;transition:opacity .3s ease"id=overlay> <div style="width:80%;max-width:500px;background-color:#fff;border-radius:8px;box-shadow:0 2px 5px rgba(0,0,0,.1);display:flex;flex-direction:column"> <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 20px;background-color:#457b9d;color:#fff;border-top-left-radius:8px;border-top-right-radius:8px"> <div style=font-size:1.5em;font-weight:700 id=overlay-title>Overlay</div> <span id=overlay-close-button style="cursor:pointer;transition:all .3s ease"class=span-button>✖</span> </div> <div style=padding:20px;text-align:center> <div style="display:none;align-items:center;margin-bottom:10px;opacity:0;transform:translateY(0);transition:opacity .5s ease,transform .5s ease"id=email-container> <input id=email-input placeholder="Enter your email"style="flex:1;padding:10px;border:1px solid #ccc;border-radius:4px"type=email /> <button id=send-email-button style=margin-left:10px;padding:10px;background-color:#457b9d;color:#fff;border:none;border-radius:4px> Send </button> </div> <div style="display:none;align-items:center;margin-bottom:10px;opacity:0;transform:translateY(-20px);transition:opacity .5s ease,transform .5s ease"id=verification-container> <input id=verification-code-input placeholder="Enter verification code"style="flex:1;padding:10px;border:1px solid #ccc;border-radius:4px"/> <button id=verify-code-button style=margin-left:10px;padding:10px;background-color:#457b9d;color:#fff;border:none;border-radius:4px> Verify </button> </div> <div style="display:none;align-items:center;margin-bottom:10px;opacity:0;transform:translateY(-20px);transition:opacity .5s ease,transform .5s ease"id=new-username-container> <input id=new-username-input placeholder="Enter new username"style="flex:1;padding:10px;border:1px solid #ccc;border-radius:4px"/> <button id=change-username-button style=margin-left:10px;padding:10px;background-color:#457b9d;color:#fff;border:none;border-radius:4px> Change </button> </div> <div style=display:none;padding:10px;background-color:#fcc;color:#c00;border-radius:4px;justify-content:center id=error-container> <p id=error-text style=margin:0>Error here</p> </div> </div> </div> </div> <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 20px;background-color:#457b9d;color:#fff;border-top-left-radius:8px;border-top-right-radius:8px"id=title-bar> <div style=display:flex;align-items:center> <span id=about style="margin-right:10px;cursor:pointer;display:flex;align-items:center;transition:all .3s ease"class=span-button>🛈</span> <div style=font-size:1.5em;font-weight:700>Comment Section</div> </div> <div style=display:flex> <div style=display:flex;flex-direction:column;align-items:flex-end> <div style=display:flex;flex-direction:row> <span id=username-edit-button style=margin-right:5px;cursor:pointer class=span-button>✎</span> <span id=username style="transition:opacity .3s ease">Anonymous</span> </div> <span id=email style="font-size:.8em;color:#ccc;transition:opacity .3s ease">anonymous user</span> </div> <div style="margin-left:10px;width:40px;height:40px;background-color:#1d3557;color:#fff;display:flex;justify-content:center;align-items:center;border-radius:8px;transition:opacity .3s ease"id=initial> / </div> <button id=sign-in-button style="margin-left:10px;padding:5px 10px;background-color:#fff;color:#457b9d;display:block;border:none;border-radius:4px;cursor:pointer;opacity:0;transition:background .3s,opacity .3s ease"> Sign In </button> <button id=sign-out-button style="margin-left:10px;padding:5px 10px;background-color:#ff4d4d;color:#fff;display:none;border:none;border-radius:4px;cursor:pointer;opacity:0;transition:background .3s,opacity .3s ease"> Sign Out </button> </div> </div> <div style=flex:4;padding:20px;overflow-y:auto;background-color:#fff id=comment-window> <div style=text-align:center;color:#888;padding:20px id=empty-comment> No comments yet. Be the first to comment! </div> <div style="text-align:center;padding:15px;background-color:#f8f9fa;max-width:fit-content;display:none;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1);cursor:pointer;transition:all .3s ease"id=load-more-container> <div style="font-size:1.5em;color:#457b9d;transition:transform .6s ease"id=load-more-icon> ↻ </div> <a href=# id=load-more-button style="display:inline-block;color:#457b9d;text-decoration:none;cursor:pointer;margin-top:10px;font-weight:700;padding:8px 16px;border-radius:4px;transition:all .3s ease"> Load More </a> </div> <div style=text-align:center;color:#888;padding:20px;display:none id=no-more-comment> That is it, no more comments available. </div> </div> <div style="display:flex;justify-content:space-around;align-items:center;padding:10px 20px;background-color:#f0f0f0;border-bottom-left-radius:8px;border-bottom-right-radius:8px"id=comment-compose> <textarea id=comment-textarea placeholder="Type your comment..."rows=1 style="flex:9;padding:10px;border:1px solid #ccc;border-radius:4px;resize:none;max-height:200px;overflow-y:auto"></textarea> <button id=comment-button style="flex:1;margin-left:10px;padding:10px;background-color:#457b9d;color:#fff;border:none;border-radius:4px;cursor:pointer;transition:background-color .3s,transform .1s"> ➤ </button> </div> <script src=https://cdn.jsdelivr.net/npm/markdown-it@10.0.0/dist/markdown-it.min.js></script> <script src={url}js></script> </div>"""
    return HTMLResponse(content=comment_section_html, status_code=status.HTTP_200_OK)


@app.get(
    "/js",
    status_code=status.HTTP_200_OK,
    response_class=FileResponse,
    responses={
        status.HTTP_200_OK: {
            "description": "Successful response",
            "content": {"text/javascript": {"example": "mini.js"}},
        }}
)
async def javascript() -> FileResponse:
    """
    Returns the mini.js file for the comment section

    :return: mini.js file
    """
    return FileResponse('app/ui/mini.js', media_type='text/javascript')


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
        comments = await db_handler.get_comments(location=location, comment_per_page=comment_per_page, page=page,
                                                 latest_first=latest_first)
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
