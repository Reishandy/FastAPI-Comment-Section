// Initialize API URL and comment location
// -----------------------------------------
const apiUrl = document.getElementById('api-url');
const commentLocation = window.location.href.split("://")[1].split('?')[0];

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

// ======================
// =      UI Script     =
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
const loadMoreContainer = document.getElementById('load-more-container');
const loadMoreIcon = document.getElementById('load-more-icon');
if (loadMoreContainer && loadMoreIcon) {
    loadMoreContainer.addEventListener('mouseover', () => {
        setStyles(loadMoreContainer, {backgroundColor: '#e9ecef'});
        loadMoreIcon.style.transform = 'rotate(180deg)';
    });
    loadMoreContainer.addEventListener('mouseout', () => {
        setStyles(loadMoreContainer, {backgroundColor: '#f8f9fa'});
        loadMoreIcon.style.transform = 'rotate(0)';
    });
    addScaleAnimation(loadMoreContainer);
}

// "About" button: open GitHub repo in new tab
const about = document.getElementById('about');
if (about) {
    about.addEventListener('click', () => {
        window.open('https://github.com/Reishandy/FastAPI-Comment-Section', '_blank');
    });
}

// Expand Textarea (up to 10 lines, max height 200px)
const textarea = document.getElementById('comment-textarea');
if (textarea) {
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    });
}

// ==================
// =   APP Script   =
// ==================

// Helper function to escape HTML for security
function escapeHTML(str) {
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
    const commentWindow = document.getElementById('comment-window');
    const loadMoreContainer = document.getElementById('load-more-container');

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
    // Escape HTML and preserve newlines
    commentTextElement.innerHTML = escapeHTML(commentText).replace(/\n/g, '<br>');
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
        const existingComments = commentWindow.querySelectorAll(':scope > div:not(#load-more-container)');
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
 * Displays a popup with a title, HTML body, and OK/Cancel buttons.
 * @param {string} title
 * @param {string} bodyHtml - HTML content for the popup body.
 * @param {Function} [onOk] - Callback when OK is clicked.
 * @param {Function} [onCancel] - Callback when Cancel (or close) is clicked.
 */
function showPopup(title, bodyHtml, onOk, onCancel) {
    const commentSection = document.getElementById('comment-section');

    // Create popup overlay
    const popupOverlay = document.createElement('div');
    setStyles(popupOverlay, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '1000',
        opacity: '0',
        transition: 'opacity 0.3s ease'
    });

    // Create popup container
    const popupContainer = document.createElement('div');
    setStyles(popupContainer, {
        width: '80%',
        maxWidth: '500px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        transform: 'scale(0.8)',
        transition: 'transform 0.3s ease'
    });

    // Title bar
    const titleBar = document.createElement('div');
    setStyles(titleBar, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        backgroundColor: '#457b9d',
        color: 'white',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px'
    });

    const titleText = document.createElement('div');
    titleText.style.fontSize = '1.5em';
    titleText.style.fontWeight = 'bold';
    titleText.textContent = title;

    const closeButton = document.createElement('span');
    closeButton.style.cursor = 'pointer';
    closeButton.textContent = '✖';
    closeButton.addEventListener('click', () => {
        popupOverlay.style.opacity = '0';
        popupContainer.style.transform = 'scale(0.8)';
        setTimeout(() => {
            commentSection.removeChild(popupOverlay);
            if (onCancel) onCancel();
        }, 300);
    });

    titleBar.appendChild(titleText);
    titleBar.appendChild(closeButton);

    // Popup body
    const body = document.createElement('div');
    body.style.padding = '20px';
    body.innerHTML = bodyHtml;

    // Popup footer with OK and Cancel buttons
    const footer = document.createElement('div');
    setStyles(footer, {
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '10px 20px',
        backgroundColor: '#f0f0f0',
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px'
    });

    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    setStyles(okButton, {
        marginRight: '10px',
        padding: '5px 10px',
        backgroundColor: '#457b9d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    });
    okButton.addEventListener('click', () => {
        popupOverlay.style.opacity = '0';
        popupContainer.style.transform = 'scale(0.8)';
        setTimeout(() => {
            commentSection.removeChild(popupOverlay);
            if (onOk) onOk();
        }, 300);
    });
    okButton.addEventListener('mouseover', () => {
        okButton.style.backgroundColor = '#1D3557';
    });
    okButton.addEventListener('mouseout', () => {
        okButton.style.backgroundColor = '#457b9d';
    });
    addScaleAnimation(okButton);

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    setStyles(cancelButton, {
        padding: '5px 10px',
        backgroundColor: '#ff4d4d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    });
    cancelButton.addEventListener('click', () => {
        popupOverlay.style.opacity = '0';
        popupContainer.style.transform = 'scale(0.8)';
        setTimeout(() => {
            commentSection.removeChild(popupOverlay);
            if (onCancel) onCancel();
        }, 300);
    });
    cancelButton.addEventListener('mouseover', () => {
        cancelButton.style.backgroundColor = '#cc0000';
    });
    cancelButton.addEventListener('mouseout', () => {
        cancelButton.style.backgroundColor = '#ff4d4d';
    });
    addScaleAnimation(cancelButton);

    footer.appendChild(okButton);
    footer.appendChild(cancelButton);

    // Assemble popup components
    popupContainer.appendChild(titleBar);
    popupContainer.appendChild(body);
    popupContainer.appendChild(footer);
    popupOverlay.appendChild(popupContainer);
    commentSection.appendChild(popupOverlay);

    // Trigger popup animation
    setTimeout(() => {
        popupOverlay.style.opacity = '1';
        popupContainer.style.transform = 'scale(1)';
    }, 10);
}

// ===================
// =    Auth Flow    =
// ===================

// Sign in click event listener
const signInButton = document.getElementById('sign-in-button');
signInButton.addEventListener('click', () => {

    showPopup('Sign In', signInPopupBody, () => {}, () => {
        // TODO: sign out
    });
});

// Sign out click event listener


// Function to sign in
function signIn() {}
function verifyToken() {}

// Function to sign out, this only needs to remove the token from local storage


// ===================
// =    Main Flow    =
// ===================

// get token and location
// get and store user info
// get and store comments
// add comments to the UI


// TODO: DEBUG REMOVE
commentButton = document.getElementById('comment-button');
commentButton.addEventListener('click', () => {
    const commentTextarea = document.getElementById('comment-textarea');
    const commentText = commentTextarea.value;
    if (commentText.trim() === '') {
        return;
    }
    addComment('/', '#1d3557', 'Anonymous', 'anonymous user', '1980-01-31', '01:23:45', commentText, true);
    commentTextarea.value = '';
    commentTextarea.style.height = 'auto';
    commentTextarea.style.height = Math.min(commentTextarea.scrollHeight, 200) + 'px';
});

// Example usage
addComment('JD', '#ff4d4d', 'John Doe', 'john.doe@example.com', '1980-01-31', '01:23:45', 'This is a comment.');
addComment('JD', '#ff4d4d', 'John Doe', 'john.doe@example.com', '1980-01-31', '01:23:45', 'This is a comment.');
addComment('JD', '#ff4d4d', 'John Doe', 'john.doe@example.com', '1980-01-31', '01:23:45', 'This is a comment.');
addComment('JD', '#ff4d4d', 'John Doe', 'john.doe@example.com', '1980-01-31', '01:23:45', 'This is a comment.');
addComment('JD', '#ff4d4d', 'John Doe', 'john.doe@example.com', '1980-01-31', '01:23:45', 'This is a comment.');
addComment('JD', '#ff4d4d', 'John Doe', 'john.doe@example.com', '1980-01-31', '01:23:45', '<script>alert("This is a comment.")<\/script>');
addComment('/', '#1d3557', 'Anonymous', 'anonymous user', '1980-01-31', '01:23:45', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus pharetra nunc aliquet lacinia dictum. Sed ac felis urna. Cras nec commodo velit, ac luctus nisi. Ut ultricies, elit vitae maximus condimentum, dolor risus pharetra elit, luctus fringilla ante ante eget nulla. Proin eget nibh vitae lacus tincidunt aliquet. Aenean ac rutrum libero. In pellentesque arcu ipsum, nec dapibus magna varius in. Donec in orci in risus aliquet laoreet id eu metus. Morbi nec nisl et justo tempus efficitur. Morbi egestas suscipit ligula, et ultrices ipsum convallis eget.\n\n' +
    '\n' +
    'Fusce ac elementum dui, ornare vulputate velit. Mauris blandit quam quis nisi mollis fringilla. Curabitur porttitor enim eget tortor dictum, et laoreet tellus aliquet. Ut metus leo, posuere ac facilisis id, laoreet a ante. Fusce finibus non nibh ac vestibulum. Donec vel ligula massa. Praesent condimentum maximus ipsum, ut commodo justo ultricies a. Vestibulum nec massa bibendum, sagittis dolor ac, iaculis augue. Vivamus vitae scelerisque dolor, ac pellentesque enim. Pellentesque dolor lectus, porttitor id commodo eu, blandit interdum ex. Nam congue faucibus rhoncus. Ut lorem nunc, cursus semper luctus non, bibendum at nunc.\n' +
    '\n' +
    'Quisque luctus tellus quis quam egestas, eu fermentum dui ornare. Proin sit amet sapien ac dui aliquam interdum sed eget arcu. Vivamus quis diam euismod, faucibus risus non, commodo turpis. Aenean ornare lacus eget tortor dictum porttitor. Suspendisse euismod vestibulum ipsum, tincidunt congue velit pulvinar nec. Nullam eget ante eros. Cras sit amet nunc nec felis eleifend finibus pretium non neque. Ut pellentesque ut nisi in lacinia. Aenean sed suscipit felis. Etiam pharetra turpis eu nulla eleifend dapibus. Donec eget magna in tortor sollicitudin ultrices. In a vulputate erat. Aliquam ante orci, porta ut arcu ut, porta accumsan lectus. Donec sit amet porttitor risus.');

loadMoreButton = document.getElementById('load-more-container');
loadMoreButton.addEventListener('click', () => {
    addComment('/', '#1d3557', 'Anonymous', 'anonymous user', '1980-01-31', '01:23:45', 'This is a comment.');
    addComment('/', '#1d3557', 'Anonymous', 'anonymous user', '1980-01-31', '01:23:45', 'This is a comment.');
    addComment('/', '#1d3557', 'Anonymous', 'anonymous user', '1980-01-31', '01:23:45', 'This is a comment.');
});