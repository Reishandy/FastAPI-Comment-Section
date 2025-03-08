// Initialize configuration and data
const tokenLocalStorageKey = 'Reis_Comment_Section_token';
const apiUrl = document.getElementById('api-url').textContent;
const commentLocation = window.location.href.split('://')[1].split('?')[0];
const commentAmountPerPage = 10;
let accessToken = localStorage.getItem(tokenLocalStorageKey);
let user = {
    username: 'Anonymous',
    email: 'anonymous user',
    initial: '/',
    color: '#1d3557'
}
let verificationEmail = '';
let currentPagination = 1;
let ws = null;
let loadedRealTimeComments = 0;
let doneFirstLoad = false;

// HTML
const commentWindow = document.getElementById('comment-window');
const loadMoreContainer = document.getElementById('load-more-container');
const loadMoreIcon = document.getElementById('load-more-icon');
const about = document.getElementById('about');
const textarea = document.getElementById('comment-textarea');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayCloseButton = document.getElementById('overlay-close-button');

const username = document.getElementById('username');
const email = document.getElementById('email');
const initial = document.getElementById('initial');

const signInButton = document.getElementById('sign-in-button');
const signOutButton = document.getElementById('sign-out-button');
const emailContainer = document.getElementById('email-container');
const sendEmailButton = document.getElementById('send-email-button');
const emailInput = document.getElementById('email-input');
const verificationContainer = document.getElementById('verification-container');
const verificationCodeInput = document.getElementById('verification-code-input');
const verifyCodeButton = document.getElementById('verify-code-button');
const ErrorContainer = document.getElementById('error-container');
const ErrorText = document.getElementById('error-text');

const newUsernameContainer = document.getElementById('new-username-container');
const newUsernameInput = document.getElementById('new-username-input');
const changeUsernameButton = document.getElementById('change-username-button');
const usernameEditButton = document.getElementById('username-edit-button');

const emptyComment = document.getElementById('empty-comment');
const noMoreComment = document.getElementById('no-more-comment');
const commentTextarea = document.getElementById('comment-textarea');
const commentButton = document.getElementById('comment-button');

// ======================
// =       UTILITY      =
// ======================

/**
 * Applies the given styles to an element.
 * @param {HTMLElement} element
 * @param {Object} styles
 */
function setStyles(element, styles) {
    Object.assign(element.style, styles);
}

/**
 * Adds scale animation on mousedown/up events.
 * @param {HTMLElement} element
 */
function addScaleAnimation(element) {
    element.addEventListener('mousedown', () => {
        element.style.transform = 'scale(0.95)';
    });
    element.addEventListener('mouseup', () => {
        element.style.transform = 'scale(1)';
    });
}

/**
 * Returns the styles to apply when a button is hovered.
 * @param {HTMLElement} button
 * @returns {Object} CSS properties
 */
function getButtonHoverStyles(button) {
    if (button.id === 'sign-in-button') {
        return {backgroundColor: '#cccccc', color: '#457b9d'};
    } else if (button.id === 'sign-out-button') {
        return {backgroundColor: '#cc0000'};
    } else {
        return {backgroundColor: '#1D3557'};
    }
}

/**
 * Returns the styles to apply when the mouse leaves a button.
 * @param {HTMLElement} button
 * @returns {Object} CSS properties
 */
function getButtonOutStyles(button) {
    if (button.id === 'sign-in-button') {
        return {backgroundColor: 'white', color: '#457b9d'};
    } else if (button.id === 'sign-out-button') {
        return {backgroundColor: '#ff4d4d'};
    } else {
        return {backgroundColor: '#457b9d'};
    }
}

/**
 * Sends a request to the API.
 * @param {string} path - The API endpoint path.
 * @param {string} token - The Bearer accessToken for authorization.
 * @param {Object} body - The request body.
 * @param {string} method - The HTTP method (e.g., 'GET', 'POST', 'PUT', 'DELETE').
 * @returns {Promise<{statusCode: number, jsonResponse: Object}>} - The status code and JSON response.
 */
async function sendToApi(method, path, token, body = null) {
    const response = await fetch(apiUrl + path, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Bearer': token
        },
        body: method !== 'GET' ? JSON.stringify(body) : undefined
    });

    const jsonResponse = await response.json();
    return {
        statusCode: response.status,
        jsonResponse: jsonResponse
    };
}

/**
 * Shows or hides a loading spinner.
 * @param {HTMLElement} parent - The parent element to attach the spinner to
 * @param {boolean} show - Whether to show (true) or hide (false) the spinner
 * @param {string} [id='spinner'] - Optional custom ID for the spinner
 * @returns {HTMLElement} - The spinner element
 */
function toggleSpinner(parent, show, id = 'spinner', isButton = false) {
    // Look for existing spinner with this ID
    let spinner = document.getElementById(id);

    // Create spinner if it doesn't exist
    if (!spinner) {
        // Create spinner container
        spinner = document.createElement('div');
        spinner.id = id;
        spinner.style.cssText = `
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
        `;

        // Create spinner animation element
        const spinnerCircle = document.createElement('div');
        if (isButton) {
            spinnerCircle.style.cssText = `
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            `;
        } else {
            spinnerCircle.style.cssText = `
                width: 40px;
                height: 40px;
                border: 4px solid rgba(69, 123, 157, 0.2);
                border-top: 4px solid #457b9d;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 10px;
            `;
        }

        // Make sure we have the animation
        if (!document.getElementById('spinner-animation')) {
            const spinnerStyle = document.createElement('style');
            spinnerStyle.id = 'spinner-animation';
            spinnerStyle.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(spinnerStyle);
        }

        // Assemble spinner
        spinner.appendChild(spinnerCircle);

        // Add to parent
        parent.insertBefore(spinner, parent.firstChild);
    }

    // Show or hide the spinner
    spinner.style.display = show ? 'flex' : 'none';

    return spinner;
}
// ======================
// =       UI Init      =
// ======================

// Button Animations
document.querySelectorAll('#comment-section button').forEach(button => {
    button.addEventListener('mouseover', () => {
        setStyles(button, getButtonHoverStyles(button));
    });
    button.addEventListener('mouseout', () => {
        setStyles(button, getButtonOutStyles(button));
    });
    addScaleAnimation(button);
});

// Load More Button Animations
loadMoreContainer.addEventListener('mouseover', () => {
    setStyles(loadMoreContainer, {backgroundColor: '#e9ecef'});
});
loadMoreContainer.addEventListener('mouseout', () => {
    setStyles(loadMoreContainer, {backgroundColor: '#f8f9fa'});
    loadMoreIcon.style.transform = 'rotate(0)';
});
addScaleAnimation(loadMoreContainer);

// "About" button: open GitHub repo in new tab
about.addEventListener('click', () => {
    window.open('https://github.com/Reishandy/FastAPI-Comment-Section', '_blank');
});

// Expand Textarea (up to 10 lines, max height 200px)
textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
});

// Overlay Close Button
overlayCloseButton.addEventListener('click', () => {
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
});

// Check edit username accesToken
if (accessToken === '' || accessToken === null) {
    usernameEditButton.style.display = 'none';
}

// Call the responsive function on window resize and on initial load
window.addEventListener('resize', applyResponsiveStyles);
document.addEventListener('DOMContentLoaded', applyResponsiveStyles);


// ==================
// =    Function    =
// ==================
/**
 * Applies responsive styles to the comment section based on the width.
 */
function applyResponsiveStyles() {
    const commentSection = document.getElementById('comment-section');
    const titleBar = document.getElementById('title-bar');
    const usernameEditButton = document.getElementById('username-edit-button');
    const signInButton = document.getElementById('sign-in-button');
    const signOutButton = document.getElementById('sign-out-button');

    if (commentSection.offsetWidth < 600) {
        titleBar.style.flexDirection = 'column';
        titleBar.style.alignItems = 'flex-start';

        const firstChild = titleBar.children[0];
        const lastChild = titleBar.children[1];
        firstChild.style.marginBottom = '10px';
        lastChild.style.flexDirection = 'row';
        lastChild.style.justifyContent = 'center';
        lastChild.style.width = '100%';

        usernameEditButton.style.transform = 'rotateZ(0)';
        usernameEditButton.style.marginLeft = '5px';
        usernameEditButton.style.marginTop = '0';

        signInButton.style.marginLeft = '10px';
        signOutButton.style.marginLeft = '10px';
    } else {
        titleBar.style.flexDirection = 'row';
        titleBar.style.alignItems = 'center';

        const firstChild = titleBar.children[0];
        const lastChild = titleBar.children[1];
        firstChild.style.marginBottom = '0';
        lastChild.style.display = 'flex';
        lastChild.style.width = 'fit-content';

        usernameEditButton.style.transform = 'rotateZ(110deg)';
        usernameEditButton.style.marginLeft = '5px';
        usernameEditButton.style.marginTop = '0';

        signInButton.style.marginLeft = '10px';
        signOutButton.style.marginLeft = '10px';
    }
}


// Helper function to escape HTML for security
/**
 * Escapes HTML characters in a string.
 * @param str - The string to escape.
 * @returns {*} - The escaped string.
 */
function escapeHTML(str) {
    return str
        .replaceAll(/&/g, '&amp;')
        .replaceAll(/</g, '&lt;')
        .replaceAll(/>/g, '&gt;')
        .replaceAll(/"/g, '&quot;')
        .replaceAll(/'/g, '&#039;');
}

/**
 * Generates and appends a comment element to the comment window.
 * @param {string} initial - The user's initial.
 * @param {string} initialColor - The background color for the initial.
 * @param {string} username
 * @param {string} email
 * @param {string} date
 * @param {string} time
 * @param {string} commentText
 * @param {boolean} [latest=false] - If true, the comment is added at the top with animation.
 */
function addComment(initial, initialColor, username, email, date, time, commentText, latest = false) {
    // Create comment container
    const commentBox = document.createElement('div');
    setStyles(commentBox, {
        position: 'relative',
        backgroundColor: '#f0f0f0',
        borderRadius: '10px',
        padding: '10px',
        marginBottom: '10px',
        maxWidth: '100%',
        minWidth: '30%',
        width: 'fit-content',
        display: 'flex',
        flexDirection: 'column',
        alignSelf: 'flex-start',
        opacity: '0',
        transform: 'translateY(-20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease'
    });

    // Create header container
    const commentHeader = document.createElement('div');
    setStyles(commentHeader, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '5px'
    });

    // Identity container
    const commentIdentity = document.createElement('div');
    setStyles(commentIdentity, {
        display: 'flex',
        alignItems: 'center'
    });

    // Avatar (initial)
    const commentInitial = document.createElement('div');
    setStyles(commentInitial, {
        width: '40px',
        height: '40px',
        backgroundColor: initialColor,
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '8px',
        marginRight: '10px',
        fontWeight: 'bold'
    });
    commentInitial.textContent = initial;

    // User info container
    const userInfoContainer = document.createElement('div');
    userInfoContainer.style.display = 'flex';
    userInfoContainer.style.flexDirection = 'column';

    const commentUsername = document.createElement('span');
    commentUsername.style.fontWeight = 'bold';
    commentUsername.textContent = username;

    const commentEmail = document.createElement('span');
    commentEmail.style.fontSize = '0.8em';
    commentEmail.style.color = '#777';
    commentEmail.textContent = email;

    userInfoContainer.appendChild(commentUsername);
    userInfoContainer.appendChild(commentEmail);

    // Date and time container
    const dateTimeContainer = document.createElement('div');
    setStyles(dateTimeContainer, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end'
    });

    const commentDate = document.createElement('span');
    commentDate.style.fontSize = '0.8em';
    commentDate.style.color = '#777';
    commentDate.textContent = date;

    const commentTime = document.createElement('span');
    commentTime.style.fontSize = '0.8em';
    commentTime.style.color = '#777';
    commentTime.textContent = time;

    dateTimeContainer.appendChild(commentDate);
    dateTimeContainer.appendChild(commentTime);

    // Assemble header
    commentIdentity.appendChild(commentInitial);
    commentIdentity.appendChild(userInfoContainer);
    commentHeader.appendChild(commentIdentity);
    commentHeader.appendChild(dateTimeContainer);
    commentBox.appendChild(commentHeader);

    // Comment text element
    const commentTextElement = document.createElement('div');
    commentTextElement.style.marginTop = '5px';
    // Escape HTML and render markdown
    if (typeof marked !== 'undefined') {
        commentTextElement.innerHTML = marked.parse(commentText.replace(/\n/g, '<br>'));
    } else {
        commentTextElement.innerHTML = commentText.replace(/\n/g, '<br>');
    }
    commentBox.appendChild(commentTextElement);

    // Insert comment into DOM for height measurement
    commentBox.style.visibility = 'hidden';
    commentBox.style.position = 'absolute';
    commentBox.style.opacity = '0';
    commentWindow.insertBefore(commentBox, loadMoreContainer);

    // Measure comment height (including margin)
    const commentHeight = commentBox.offsetHeight + 10;

    // Remove temporary comment box and reset styles
    commentWindow.removeChild(commentBox);
    commentBox.style.visibility = '';
    commentBox.style.position = 'relative';

    // Animate insertion for latest comments
    if (latest) {
        // Scroll to top and adjust existing comments
        commentWindow.scrollTop = 0;
        const firstChild = commentWindow.firstChild;
        const existingComments = commentWindow.querySelectorAll(':scope > div');
        existingComments.forEach(comment => {
            if (!comment.style.transition) {
                comment.style.transition = 'transform 0.5s ease';
            }
            comment.style.transform = `translateY(${commentHeight}px)`;
            setTimeout(() => {
                comment.style.transition = '';
                comment.style.transform = 'translateY(0)';
            }, 500);
        });
        setTimeout(() => {
            commentWindow.insertBefore(commentBox, firstChild);
            setTimeout(() => {
                commentBox.style.opacity = '1';
                commentBox.style.transform = 'translateY(0)';
            }, 50);
        }, 500);
    } else {
        // Append at the bottom with a fade-in effect
        commentBox.style.transform = 'translateY(20px)';
        commentWindow.insertBefore(commentBox, loadMoreContainer);
        setTimeout(() => {
            commentBox.style.opacity = '1';
            commentBox.style.transform = 'translateY(0)';
        }, 100);
    }
}

/**
 * Sets the user display based on the current user object.
 */
function setUserDisplay() {
    // Fade out current user display
    username.style.opacity = '0';
    email.style.opacity = '0';
    initial.style.opacity = '0';

    setTimeout(() => {
        // Update user display
        username.textContent = user.username;
        email.textContent = user.email;
        initial.textContent = user.initial;
        initial.style.backgroundColor = user.color;

        // Fade in updated user display
        username.style.opacity = '1';
        email.style.opacity = '1';
        initial.style.opacity = '1';
    }, 300);

    if (user.username === 'Anonymous') {
        accessToken = '';
        localStorage.setItem(tokenLocalStorageKey, '');
    }
}

/**
 * Updates the user object and UI based on the current accessToken.
 */
function updateUser() {
    sendToApi('GET', 'user', accessToken, {})
        .then(response => {
            if (response.statusCode === 200) {
                user = response.jsonResponse;
                setUserDisplay();
            }
        });
}

/**
 * Opens the sign-in overlay.
 */
function openOverlay() {
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);
}

/**
 * Shows the sign-in or sign-out button based on the current accessToken.
 */
function showSignInOrOut() {
    if (accessToken) {
        // Fade out sign-in button
        signInButton.style.opacity = '0';
        setTimeout(() => {
            signInButton.style.display = 'none';
            // Fade in sign-out button
            signOutButton.style.display = 'block';
            setTimeout(() => {
                signOutButton.style.opacity = '1';
            }, 10);
        }, 300);
    } else {
        // Fade out sign-out button
        signOutButton.style.opacity = '0';
        setTimeout(() => {
            signOutButton.style.display = 'none';
            // Fade in sign-in button
            signInButton.style.display = 'block';
            setTimeout(() => {
                signInButton.style.opacity = '1';
            }, 10);
        }, 300);
    }
}

/**
 * Gets the comments for the given page.
 * @param page - The page number.
 * @returns {*[]} - The comments.
 */
async function getComments(page) {
    let comments = [];

    const path = 'comment/' + commentLocation + '?comment_per_page=' + commentAmountPerPage + '&page=' + page;
    await sendToApi('GET', path, accessToken)
        .then(response => {
            if (response.statusCode === 200) {
                comments = JSON.parse(response.jsonResponse.comments
                    .replaceAll(/'/g, '"')
                    .replaceAll(/True/g, 'true')
                    .replaceAll(/False/g, 'false'));
            } else {
                // Show error message
                console.error(response.jsonResponse.message);
            }
        });

    return comments;
}

/**
 * Initializes the comment section with the first page of comments.
 */
async function initComment() {
    // Show loading spinner
    toggleSpinner(commentWindow, true, 'comments-spinner');

    const comments = await getComments(1);

    // Hide loading spinner
    toggleSpinner(commentWindow, false, 'comments-spinner');

    if (comments && comments.length > 0) {
        // Hide empty comments message and display load more button
        if (emptyComment) {
            emptyComment.style.display = 'none';
            loadMoreContainer.style.display = 'block';
        }

        // Add comments to the UI
        comments.forEach(comment => {
            addComment(
                comment.initial,
                comment.color,
                comment.username,
                comment.email,
                comment.date,
                comment.time,
                comment.comment
            );
        });
    }
}

/**
 * Connects to the WebSocket for real-time comment updates.
 */
function connectWebSocket() {
    if (ws) {
        ws.close();
    }

    const wsUrl = `ws://${apiUrl.split('://')[1]}comment/${commentLocation}`;

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = function () {
            console.log('WebSocket connection established');
        };

        ws.onmessage = function (event) {
            const comment = JSON.parse(event.data);
            // Add new comment at the top with animation
            addComment(
                comment.initial,
                comment.color,
                comment.username,
                comment.email,
                comment.date,
                comment.time,
                comment.comment,
                true
            );

            // Hide empty comment message if it's showing
            if (emptyComment) {
                emptyComment.style.display = 'none';
            }
        };

        ws.onclose = function () {
            console.log('WebSocket connection closed');
            // Attempt to reconnect after 5 seconds
            setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = function (error) {
            console.error('WebSocket error:', error);
        };
    } catch (error) {
        console.error('Failed to create WebSocket:', error);
        // Attempt to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
    }
}

// ===================
// =    Auth Flow    =
// ===================

// Init show sign in or out
showSignInOrOut()

// Sign out
signOutButton.addEventListener('click', () => {
    // Just clear the accessToken and update the UI
    localStorage.setItem(tokenLocalStorageKey, '');
    accessToken = '';
    updateUser()
    showSignInOrOut()
    usernameEditButton.style.display = 'none';
});

// Sign in
// Open sign in specific elements in overlay
signInButton.addEventListener('click', () => {
    openOverlay()
    overlayTitle.innerText = 'Sign In';

    // Hide verification code and new username input
    verificationContainer.style.display = 'none';
    newUsernameContainer.style.display = 'none';

    emailContainer.style.display = 'flex';
    setTimeout(() => {
        emailContainer.style.opacity = '1';
        emailContainer.style.transform = 'translateY(0)';
    }, 100);
});

// Send email to API
sendEmailButton.addEventListener('click', () => {
    // Reset error message
    ErrorContainer.style.display = 'none';

    const email = emailInput.value;
    // Validate email with regex r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(email)) {
        ErrorContainer.style.display = 'flex';
        ErrorText.textContent = 'Invalid email address.';
        return;
    }
    verificationEmail = email; // Store email for verification

    // Send email to API
    sendToApi('POST', 'token', '', {email: email})
        .then(response => {
            if (response.statusCode === 200) {
                // Show verification code input
                verificationContainer.style.display = 'flex';
                setTimeout(() => {
                    verificationContainer.style.opacity = '1';
                    verificationContainer.style.transform = 'translateY(0)';
                }, 100);

                // Disable the send button and start the countdown
                sendEmailButton.disabled = true;
                sendEmailButton.style.cursor = 'not-allowed';
                let countdown = 60;
                sendEmailButton.textContent = `${countdown}s`;

                const countdownInterval = setInterval(() => {
                    countdown -= 1;
                    sendEmailButton.textContent = `${countdown}s`;

                    if (countdown <= 0) {
                        clearInterval(countdownInterval);
                        sendEmailButton.disabled = false;
                        sendEmailButton.style.cursor = 'pointer';
                        sendEmailButton.textContent = 'Send';
                    }
                }, 1000);
            } else {
                // Show error message
                ErrorContainer.style.display = 'flex';
                ErrorText.textContent = response.jsonResponse.message;
            }
        });
})

// Verify email with code
verifyCodeButton.addEventListener('click', () => {
    // Reset error message
    ErrorContainer.style.display = 'none';

    const code = verificationCodeInput.value;
    if (code.length !== 6) {
        ErrorContainer.style.display = 'flex';
        ErrorText.textContent = 'Invalid verification code.';
        return;
    }

    // Verify code with API
    sendToApi('POST', 'verify', '', {email: verificationEmail, verification_code: code})
        .then(response => {
            if (response.statusCode === 200) {
                // Store accessToken and update user
                accessToken = response.jsonResponse.access_token;
                localStorage.setItem(tokenLocalStorageKey, accessToken);
                updateUser();
                showSignInOrOut()
                usernameEditButton.style.display = 'block';

                // Close overlay
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 300);
            } else {
                // Show error message
                ErrorContainer.style.display = 'flex';
                ErrorText.textContent = response.jsonResponse.message;
            }
        });
});

// Change username
usernameEditButton.addEventListener('click', () => {
    openOverlay()
    overlayTitle.innerText = 'Change Username';

    // Hide email input and verification code
    emailContainer.style.display = 'none';
    verificationContainer.style.display = 'none';

    // Show new username input
    newUsernameContainer.style.display = 'flex';
    setTimeout(() => {
        newUsernameContainer.style.opacity = '1';
        newUsernameContainer.style.transform = 'translateY(0)';
    }, 100);
});

changeUsernameButton.addEventListener('click', () => {
    // Reset error message
    ErrorContainer.style.display = 'none';

    const newUsername = newUsernameInput.value;
    if (newUsername.trim() === '') {
        ErrorContainer.style.display = 'flex';
        ErrorText.textContent = 'Username cannot be empty.';
        return;
    }

    // Send new username to API
    sendToApi('PUT', 'user?new_username=' + newUsername, accessToken)
        .then(response => {
            if (response.statusCode === 200) {
                // Update user and close overlay
                user.username = newUsername;
                setUserDisplay();
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 300);
            } else {
                // Show error message
                ErrorContainer.style.display = 'flex';
                ErrorText.textContent = response.jsonResponse.message;
            }
        });
});


// ===================
// =    Main Flow    =
// ===================

// update user every startup
updateUser()

// get and display comments
initComment()

// watch for new comments with websocket
connectWebSocket()

// Load more comments
loadMoreContainer.addEventListener('click', async () => {
    // Make icon spin continuously while loading
    loadMoreIcon.style.animation = 'spin 1s linear infinite';

    currentPagination += 1;
    let comments = await getComments(currentPagination);

    if (loadedRealTimeComments > 0 && !doneFirstLoad) {
        // omit the comments that are already loaded
        comments = comments.slice(loadedRealTimeComments, comments.length)
        doneFirstLoad = true;
    }

    // Stop spinning animation when comments are loaded
    loadMoreIcon.style.animation = '';

    if (comments && comments.length > 0) {
        comments.forEach(comment => {
            addComment(
                comment.initial,
                comment.color,
                comment.username,
                comment.email,
                comment.date,
                comment.time,
                comment.comment
            );
        });

        if (comments.length < commentAmountPerPage) {
            noMoreComment.style.display = 'block';
            loadMoreContainer.style.display = 'none';
        }
    } else {
        noMoreComment.style.display = 'none';
        loadMoreContainer.style.display = 'block';
    }
});

// post new comment
commentButton.addEventListener('click', async () => {
    let commentText = commentTextarea.value;
    if (commentText.trim() === '') {
        return;
    }

    // Spinner
    commentButton.innerHTML = '';
    commentButton.disabled = true;
    commentButton.style.cursor = 'not-allowed';
    toggleSpinner(commentButton, true, 'comment-spinner-send', true);


    // Escape newlines and trim whitespace, also escape html
    commentText = commentTextarea.value.replace('\\', '\\\\')
    commentText = escapeHTML(commentText).trim()

    await sendToApi('POST', 'comment/' + commentLocation, accessToken, {comment: commentText})
        .then(response => {
            if (response.statusCode === 201) {
                // disable spinner
                commentButton.innerHTML = '&#x27A4;';
                commentButton.disabled = false;
                commentButton.style.cursor = 'pointer';
                toggleSpinner(commentButton, false, 'comment-spinner-send', true);

                commentTextarea.value = '';
                commentTextarea.dispatchEvent(new Event('input'));

                // Scroll to top
                commentWindow.scrollTop = 0;
                loadedRealTimeComments += 1;
            } else {
                // Show error message
                console.error(response.jsonResponse.message);
            }
        });
});