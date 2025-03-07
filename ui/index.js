// === UI Script ===
// Add hover and click animations for buttons
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('mouseover', () => {
        if (button.id === 'sign-in-button') {
            button.style.backgroundColor = '#cccccc';
            button.style.color = '#007bff';
        } else if (button.id === 'sign-out-button') {
            button.style.backgroundColor = '#cc0000';
        } else {
            button.style.backgroundColor = '#0056b3';
        }
    });
    button.addEventListener('mouseout', () => {
        if (button.id === 'sign-in-button') {
            button.style.backgroundColor = 'white';
            button.style.color = '#007bff';
        } else if (button.id === 'sign-out-button') {
            button.style.backgroundColor = '#ff4d4d';
        } else {
            button.style.backgroundColor = '#007bff';
        }
    });
    button.addEventListener('mousedown', () => {
        button.style.transform = 'scale(0.95)';
    });
    button.addEventListener('mouseup', () => {
        button.style.transform = 'scale(1)';
    });
});

const loadMoreContainer = document.getElementById('load-more-container');
const loadMoreIcon = document.getElementById('load-more-icon');

loadMoreContainer.addEventListener('mouseover', () => {
    loadMoreContainer.style.backgroundColor = '#e9ecef';
    loadMoreIcon.style.transform = 'rotate(180deg)';
});
loadMoreContainer.addEventListener('mouseout', () => {
    loadMoreContainer.style.backgroundColor = '#f8f9fa';
    loadMoreIcon.style.transform = 'rotate(0)';
});
loadMoreContainer.addEventListener('mousedown', () => {
    loadMoreContainer.style.transform = 'scale(0.95)';
});
loadMoreContainer.addEventListener('mouseup', () => {
    loadMoreContainer.style.transform = 'scale(1)';
});

// Expand textarea up to 10 lines
const textarea = document.getElementById('comment-textarea');
textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
});

// === APP Script ===
// Function to generate and append comment
function addComment(initial, initialColor, username, email, date, time, commentText, latest = false) {
    const commentWindow = document.getElementById('comment-window');
    const loadMoreContainer = document.getElementById('load-more-container');

    const commentBox = document.createElement('div');
    commentBox.style.position = 'relative';
    commentBox.style.backgroundColor = '#e0e0e0';
    commentBox.style.borderRadius = '10px';
    commentBox.style.padding = '10px';
    commentBox.style.marginBottom = '10px';
    commentBox.style.maxWidth = '100%';
    commentBox.style.minWidth = '30%';
    commentBox.style.width = 'fit-content';
    commentBox.style.display = 'flex';
    commentBox.style.flexDirection = 'column';
    commentBox.style.alignSelf = 'flex-start';
    commentBox.style.opacity = '0';
    commentBox.style.transform = 'translateY(-20px)';
    commentBox.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

    const commentPointer = document.createElement('div');
    commentPointer.style.content = '';
    commentPointer.style.position = 'absolute';
    commentPointer.style.top = '10px';
    commentPointer.style.left = '-10px';
    commentPointer.style.borderWidth = '10px';
    commentPointer.style.borderStyle = 'solid';
    commentPointer.style.borderColor = 'transparent #e0e0e0 transparent transparent';
    commentBox.appendChild(commentPointer);

    const commentHeader = document.createElement('div');
    commentHeader.style.display = 'flex';
    commentHeader.style.justifyContent = 'space-between';
    commentHeader.style.alignItems = 'center';
    commentHeader.style.marginBottom = '5px';

    const commentIdentity = document.createElement('div');
    commentIdentity.style.display = 'flex';
    commentIdentity.style.alignItems = 'center';

    const commentInitial = document.createElement('div');
    commentInitial.style.width = '40px';
    commentInitial.style.height = '40px';
    commentInitial.style.backgroundColor = initialColor;
    commentInitial.style.color = 'white';
    commentInitial.style.display = 'flex';
    commentInitial.style.justifyContent = 'center';
    commentInitial.style.alignItems = 'center';
    commentInitial.style.borderRadius = '8px';
    commentInitial.style.marginRight = '10px';
    commentInitial.textContent = initial;

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

    const dateTimeContainer = document.createElement('div');
    dateTimeContainer.style.display = 'flex';
    dateTimeContainer.style.flexDirection = 'column';
    dateTimeContainer.style.alignItems = 'flex-end';

    const commentDate = document.createElement('span');
    commentDate.style.fontSize = '0.8em';
    commentDate.style.color = '#777';
    commentDate.textContent = date;

    const commentTime = document.createElement('span');
    commentTime.style.fontSize = '0.8em';
    commentTime.style.color = '#777';
    commentTime.textContent = time;

    const commentTextElement = document.createElement('div');
    commentTextElement.style.marginTop = '5px';
    commentTextElement.innerHTML = escapeHTML(commentText).replace(/\n/g, '<br>');

    userInfoContainer.appendChild(commentUsername);
    userInfoContainer.appendChild(commentEmail);
    dateTimeContainer.appendChild(commentDate);
    dateTimeContainer.appendChild(commentTime);
    commentIdentity.appendChild(commentInitial);
    commentIdentity.appendChild(userInfoContainer);
    commentHeader.appendChild(commentIdentity);
    commentHeader.appendChild(dateTimeContainer);
    commentBox.appendChild(commentHeader);
    commentBox.appendChild(commentTextElement);


    // First, add the comment to the DOM but keep it hidden for measurement
    commentBox.style.visibility = 'hidden';
    commentBox.style.position = 'absolute';
    commentBox.style.opacity = '0';
    commentWindow.insertBefore(commentBox, loadMoreContainer);

    // Get the height of the newly created comment
    const commentHeight = commentBox.offsetHeight + 10; // Adding margin

    // Remove the temp comment
    commentWindow.removeChild(commentBox);

    // Reset styles that were used for measurement
    commentBox.style.visibility = '';
    commentBox.style.position = 'relative';

    // Apply "make space" animation to existing comments when adding at the top
    if (latest) {
        // Scroll to top
        commentWindow.scrollTop = 0;

        const firstChild = commentWindow.firstChild;

        // Add "make space" animation to existing comments
        const existingComments = commentWindow.querySelectorAll(':scope > div:not(#load-more-container)');
        existingComments.forEach(comment => {
            // Set transition if not already set
            if (!comment.style.transition) {
                comment.style.transition = 'transform 0.5s ease';
            }

            // Push down existing comments
            comment.style.transform = `translateY(${commentHeight}px)`;

            // Reset position after animation
            setTimeout(() => {
                comment.style.transition = '';
                comment.style.transform = 'translateY(0)';
            }, 500);
        });

        setTimeout(() => {
            commentWindow.insertBefore(commentBox, firstChild);
            // Trigger fade-in animation after a small delay
            setTimeout(() => {
                commentBox.style.opacity = '1';
                commentBox.style.transform = 'translateY(0)';
            }, 50);
        }, 500)
    } else {
        commentBox.style.transform = `translateY(20px)`;
        commentWindow.insertBefore(commentBox, loadMoreContainer);

        // Trigger fade-in animation after a small delay
        setTimeout(() => {
            commentBox.style.opacity = '1';
            commentBox.style.transform = 'translateY(0)';
        }, 100);
    }
}

// Helper function to escape HTML
function escapeHTML(str) {
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

















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