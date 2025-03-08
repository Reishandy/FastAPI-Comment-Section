const tokenLocalStorageKey="Reis_Comment_Section_token",apiUrl=document.getElementById("api-url").textContent,commentLocation=window.location.href.split("://")[1].split("?")[0],commentAmountPerPage=10;let accessToken=localStorage.getItem(tokenLocalStorageKey),user={username:"Anonymous",email:"anonymous user",initial:"/",color:"#1d3557"},verificationEmail="",currentPagination=1,ws=null,loadedRealTimeComments=0,doneFirstLoad=!1;const commentWindow=document.getElementById("comment-window"),loadMoreContainer=document.getElementById("load-more-container"),loadMoreIcon=document.getElementById("load-more-icon"),about=document.getElementById("about"),textarea=document.getElementById("comment-textarea"),overlay=document.getElementById("overlay"),overlayTitle=document.getElementById("overlay-title"),overlayCloseButton=document.getElementById("overlay-close-button"),username=document.getElementById("username"),email=document.getElementById("email"),initial=document.getElementById("initial"),signInButton=document.getElementById("sign-in-button"),signOutButton=document.getElementById("sign-out-button"),emailContainer=document.getElementById("email-container"),sendEmailButton=document.getElementById("send-email-button"),emailInput=document.getElementById("email-input"),verificationContainer=document.getElementById("verification-container"),verificationCodeInput=document.getElementById("verification-code-input"),verifyCodeButton=document.getElementById("verify-code-button"),ErrorContainer=document.getElementById("error-container"),ErrorText=document.getElementById("error-text"),newUsernameContainer=document.getElementById("new-username-container"),newUsernameInput=document.getElementById("new-username-input"),changeUsernameButton=document.getElementById("change-username-button"),usernameEditButton=document.getElementById("username-edit-button"),emptyComment=document.getElementById("empty-comment"),noMoreComment=document.getElementById("no-more-comment"),commentTextarea=document.getElementById("comment-textarea"),commentButton=document.getElementById("comment-button");function setStyles(e,t){Object.assign(e.style,t)}function addScaleAnimation(e){e.addEventListener("mousedown",(()=>{e.style.transform="scale(0.95)"})),e.addEventListener("mouseup",(()=>{e.style.transform="scale(1)"}))}function getButtonHoverStyles(e){return"sign-in-button"===e.id?{backgroundColor:"#cccccc",color:"#457b9d"}:"sign-out-button"===e.id?{backgroundColor:"#cc0000"}:{backgroundColor:"#1D3557"}}function getButtonOutStyles(e){return"sign-in-button"===e.id?{backgroundColor:"white",color:"#457b9d"}:"sign-out-button"===e.id?{backgroundColor:"#ff4d4d"}:{backgroundColor:"#457b9d"}}async function sendToApi(e,t,n,o=null){const i=await fetch(apiUrl+t,{method:e,headers:{"Content-Type":"application/json",Bearer:n},body:"GET"!==e?JSON.stringify(o):void 0}),s=await i.json();return{statusCode:i.status,jsonResponse:s}}function toggleSpinner(e,t,n="spinner",o=!1){let i=document.getElementById(n);if(!i){i=document.createElement("div"),i.id=n,i.style.cssText="\n            display: none;\n            flex-direction: column;\n            align-items: center;\n            justify-content: center;\n            width: 100%;\n        ";const t=document.createElement("div");if(t.style.cssText=o?"\n                width: 20px;\n                height: 20px;\n                border: 2px solid rgba(255, 255, 255, 0.2);\n                border-top: 2px solid white;\n                border-radius: 50%;\n                animation: spin 1s linear infinite;\n            ":"\n                width: 40px;\n                height: 40px;\n                border: 4px solid rgba(69, 123, 157, 0.2);\n                border-top: 4px solid #457b9d;\n                border-radius: 50%;\n                animation: spin 1s linear infinite;\n                margin-bottom: 10px;\n            ",!document.getElementById("spinner-animation")){const e=document.createElement("style");e.id="spinner-animation",e.textContent="\n                @keyframes spin {\n                    0% { transform: rotate(0deg); }\n                    100% { transform: rotate(360deg); }\n                }\n            ",document.head.appendChild(e)}i.appendChild(t),e.insertBefore(i,e.firstChild)}return i.style.display=t?"flex":"none",i}function applyResponsiveStyles(){const e=document.getElementById("comment-section"),t=document.getElementById("title-bar"),n=document.getElementById("username-edit-button"),o=document.getElementById("sign-in-button"),i=document.getElementById("sign-out-button");if(e.offsetWidth<600){t.style.flexDirection="column",t.style.alignItems="flex-start";const e=t.children[0],s=t.children[1];e.style.marginBottom="10px",s.style.flexDirection="row",s.style.justifyContent="center",s.style.width="100%",n.style.transform="rotateZ(0)",n.style.marginLeft="5px",n.style.marginTop="0",o.style.marginLeft="10px",i.style.marginLeft="10px"}else{t.style.flexDirection="row",t.style.alignItems="center";const e=t.children[0],s=t.children[1];e.style.marginBottom="0",s.style.display="flex",s.style.width="fit-content",n.style.marginLeft="5px",n.style.marginTop="0",o.style.marginLeft="10px",i.style.marginLeft="10px"}}function escapeHTML(e){return e.replaceAll(/&/g,"&amp;").replaceAll(/</g,"&lt;").replaceAll(/>/g,"&gt;").replaceAll(/"/g,"&quot;").replaceAll(/'/g,"&#039;")}function addComment(e,t,n,o,i,s,a,l=!1){const r=document.createElement("div");setStyles(r,{position:"relative",backgroundColor:"#f0f0f0",borderRadius:"10px",padding:"10px",marginBottom:"10px",maxWidth:"100%",minWidth:"30%",width:"fit-content",display:"flex",flexDirection:"column",alignSelf:"flex-start",opacity:"0",transform:"translateY(-20px)",transition:"opacity 0.5s ease, transform 0.5s ease"});const m=document.createElement("div");setStyles(m,{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"5px"});const c=document.createElement("div");setStyles(c,{display:"flex",alignItems:"center"});const d=document.createElement("div");setStyles(d,{width:"40px",height:"40px",backgroundColor:t,color:"white",display:"flex",justifyContent:"center",alignItems:"center",borderRadius:"8px",marginRight:"10px",fontWeight:"bold"}),d.textContent=e;const u=document.createElement("div");u.style.display="flex",u.style.flexDirection="column";const y=document.createElement("span");y.style.fontWeight="bold",y.textContent=n;const p=document.createElement("span");p.style.fontSize="0.8em",p.style.color="#777",p.textContent=o,u.appendChild(y),u.appendChild(p);const g=document.createElement("div");setStyles(g,{display:"flex",flexDirection:"column",alignItems:"flex-end"});const f=document.createElement("span");f.style.fontSize="0.8em",f.style.color="#777",f.textContent=i;const C=document.createElement("span");C.style.fontSize="0.8em",C.style.color="#777",C.textContent=s,g.appendChild(f),g.appendChild(C),c.appendChild(d),c.appendChild(u),m.appendChild(c),m.appendChild(g),r.appendChild(m);const E=document.createElement("div");E.style.marginTop="5px","undefined"!=typeof marked?E.innerHTML=marked.parse(a.replace(/\n/g,"<br>")):E.innerHTML=a.replace(/\n/g,"<br>"),r.appendChild(E),r.style.visibility="hidden",r.style.position="absolute",r.style.opacity="0",commentWindow.insertBefore(r,loadMoreContainer);const x=r.offsetHeight+10;if(commentWindow.removeChild(r),r.style.visibility="",r.style.position="relative",l){commentWindow.scrollTop=0;const e=commentWindow.firstChild;commentWindow.querySelectorAll(":scope > div").forEach((e=>{e.style.transition||(e.style.transition="transform 0.5s ease"),e.style.transform=`translateY(${x}px)`,setTimeout((()=>{e.style.transition="",e.style.transform="translateY(0)"}),500)})),setTimeout((()=>{commentWindow.insertBefore(r,e),setTimeout((()=>{r.style.opacity="1",r.style.transform="translateY(0)"}),50)}),500)}else r.style.transform="translateY(20px)",commentWindow.insertBefore(r,loadMoreContainer),setTimeout((()=>{r.style.opacity="1",r.style.transform="translateY(0)"}),100)}function setUserDisplay(){username.style.opacity="0",email.style.opacity="0",initial.style.opacity="0",setTimeout((()=>{username.textContent=user.username,email.textContent=user.email,initial.textContent=user.initial,initial.style.backgroundColor=user.color,username.style.opacity="1",email.style.opacity="1",initial.style.opacity="1"}),300),"Anonymous"===user.username&&(accessToken="",localStorage.setItem(tokenLocalStorageKey,""))}function updateUser(){sendToApi("GET","user",accessToken,{}).then((e=>{200===e.statusCode&&(user=e.jsonResponse,setUserDisplay())}))}function openOverlay(){overlay.style.display="flex",setTimeout((()=>{overlay.style.opacity="1"}),10)}function showSignInOrOut(){accessToken?(signInButton.style.opacity="0",setTimeout((()=>{signInButton.style.display="none",signOutButton.style.display="block",setTimeout((()=>{signOutButton.style.opacity="1"}),10)}),300)):(signOutButton.style.opacity="0",setTimeout((()=>{signOutButton.style.display="none",signInButton.style.display="block",setTimeout((()=>{signInButton.style.opacity="1"}),10)}),300))}async function getComments(e){let t=[];const n="comment/"+commentLocation+"?comment_per_page="+commentAmountPerPage+"&page="+e;return await sendToApi("GET",n,accessToken).then((e=>{200===e.statusCode?t=JSON.parse(e.jsonResponse.comments.replaceAll(/'/g,'"').replaceAll(/True/g,"true").replaceAll(/False/g,"false")):console.error(e.jsonResponse.message)})),t}async function initComment(){toggleSpinner(commentWindow,!0,"comments-spinner");const e=await getComments(1);toggleSpinner(commentWindow,!1,"comments-spinner"),e&&e.length>0&&(emptyComment&&(emptyComment.style.display="none"),e.length<commentAmountPerPage?noMoreComment.style.display="block":loadMoreContainer.style.display="block",e.forEach((e=>{addComment(e.initial,e.color,e.username,e.email,e.date,e.time,e.comment)})))}function connectWebSocket(){ws&&ws.close();const e=`ws://${apiUrl.split("://")[1]}comment/${commentLocation}`;try{ws=new WebSocket(e),ws.onopen=function(){console.log("WebSocket connection established")},ws.onmessage=function(e){const t=JSON.parse(e.data);addComment(t.initial,t.color,t.username,t.email,t.date,t.time,t.comment,!0),emptyComment&&(emptyComment.style.display="none",noMoreComment.style.display="block")},ws.onclose=function(){console.log("WebSocket connection closed"),setTimeout(connectWebSocket,5e3)},ws.onerror=function(e){console.error("WebSocket error:",e)}}catch(e){console.error("Failed to create WebSocket:",e),setTimeout(connectWebSocket,5e3)}}document.querySelectorAll("#comment-section button").forEach((e=>{e.addEventListener("mouseover",(()=>{setStyles(e,getButtonHoverStyles(e))})),e.addEventListener("mouseout",(()=>{setStyles(e,getButtonOutStyles(e))})),addScaleAnimation(e)})),loadMoreContainer.addEventListener("mouseover",(()=>{setStyles(loadMoreContainer,{backgroundColor:"#e9ecef"})})),loadMoreContainer.addEventListener("mouseout",(()=>{setStyles(loadMoreContainer,{backgroundColor:"#f8f9fa"}),loadMoreIcon.style.transform="rotate(0)"})),addScaleAnimation(loadMoreContainer),document.querySelectorAll(".span-button").forEach((e=>{e.addEventListener("mouseover",(()=>{e.style.transform="scale(1.3)"})),e.addEventListener("mouseout",(()=>{e.style.transform="scale(1)"}))})),about.addEventListener("click",(()=>{window.open("https://github.com/Reishandy/FastAPI-Comment-Section","_blank")})),textarea.style.height=Math.min(textarea.scrollHeight,200)+"px",textarea.addEventListener("input",(()=>{textarea.style.height="auto",textarea.style.height=Math.min(textarea.scrollHeight,200)+"px"})),overlayCloseButton.addEventListener("click",(()=>{overlay.style.opacity="0",setTimeout((()=>{overlay.style.display="none"}),300)})),""!==accessToken&&null!==accessToken||(usernameEditButton.style.display="none"),window.addEventListener("resize",applyResponsiveStyles),document.addEventListener("DOMContentLoaded",applyResponsiveStyles),showSignInOrOut(),signOutButton.addEventListener("click",(()=>{localStorage.setItem(tokenLocalStorageKey,""),accessToken="",updateUser(),showSignInOrOut(),usernameEditButton.style.display="none"})),signInButton.addEventListener("click",(()=>{openOverlay(),overlayTitle.innerText="Sign In",verificationContainer.style.display="none",newUsernameContainer.style.display="none",emailContainer.style.display="flex",setTimeout((()=>{emailContainer.style.opacity="1",emailContainer.style.transform="translateY(0)"}),100)})),sendEmailButton.addEventListener("click",(()=>{ErrorContainer.style.display="none";const e=emailInput.value;if(!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(e))return ErrorContainer.style.display="flex",void(ErrorText.textContent="Invalid email address.");verificationEmail=e,sendToApi("POST","token","",{email:e}).then((e=>{if(200===e.statusCode){verificationContainer.style.display="flex",setTimeout((()=>{verificationContainer.style.opacity="1",verificationContainer.style.transform="translateY(0)"}),100),sendEmailButton.disabled=!0,sendEmailButton.style.cursor="not-allowed";let e=60;sendEmailButton.textContent=`${e}s`;const t=setInterval((()=>{e-=1,sendEmailButton.textContent=`${e}s`,e<=0&&(clearInterval(t),sendEmailButton.disabled=!1,sendEmailButton.style.cursor="pointer",sendEmailButton.textContent="Send")}),1e3)}else ErrorContainer.style.display="flex",ErrorText.textContent=e.jsonResponse.message}))})),verifyCodeButton.addEventListener("click",(()=>{ErrorContainer.style.display="none";const e=verificationCodeInput.value;if(6!==e.length)return ErrorContainer.style.display="flex",void(ErrorText.textContent="Invalid verification code.");sendToApi("POST","verify","",{email:verificationEmail,verification_code:e}).then((e=>{200===e.statusCode?(accessToken=e.jsonResponse.access_token,localStorage.setItem(tokenLocalStorageKey,accessToken),updateUser(),showSignInOrOut(),usernameEditButton.style.display="block",overlay.style.opacity="0",setTimeout((()=>{overlay.style.display="none"}),300)):(ErrorContainer.style.display="flex",ErrorText.textContent=e.jsonResponse.message)}))})),usernameEditButton.addEventListener("click",(()=>{openOverlay(),overlayTitle.innerText="Change Username",emailContainer.style.display="none",verificationContainer.style.display="none",newUsernameContainer.style.display="flex",setTimeout((()=>{newUsernameContainer.style.opacity="1",newUsernameContainer.style.transform="translateY(0)"}),100)})),changeUsernameButton.addEventListener("click",(()=>{ErrorContainer.style.display="none";const e=newUsernameInput.value.trim();if(e.length<3||e.length>20)return ErrorContainer.style.display="flex",void(ErrorText.textContent="Username must be between 3 and 20 characters.");sendToApi("PUT","user?new_username="+e,accessToken).then((t=>{200===t.statusCode?(user.username=e,setUserDisplay(),overlay.style.opacity="0",setTimeout((()=>{overlay.style.display="none"}),300)):(ErrorContainer.style.display="flex",ErrorText.textContent=t.jsonResponse.message)})).finally((()=>{newUsernameInput.value=""}))})),updateUser(),initComment(),connectWebSocket(),loadMoreContainer.addEventListener("click",(async()=>{loadMoreIcon.style.animation="spin 1s linear infinite",currentPagination+=1;let e=await getComments(currentPagination);loadedRealTimeComments>0&&!doneFirstLoad&&(e=e.slice(loadedRealTimeComments,e.length),doneFirstLoad=!0),loadMoreIcon.style.animation="",e&&e.length>0?(e.forEach((e=>{addComment(e.initial,e.color,e.username,e.email,e.date,e.time,e.comment)})),e.length<commentAmountPerPage&&(noMoreComment.style.display="block",loadMoreContainer.style.display="none")):(noMoreComment.style.display="block",loadMoreContainer.style.display="none")})),commentButton.addEventListener("click",(async()=>{let e=commentTextarea.value;""!==e.trim()&&(commentButton.innerHTML="",commentButton.disabled=!0,commentButton.style.cursor="not-allowed",toggleSpinner(commentButton,!0,"comment-spinner-send",!0),e=commentTextarea.value.replace("\\","\\\\"),e=escapeHTML(e).trim(),await sendToApi("POST","comment/"+commentLocation,accessToken,{comment:e}).then((e=>{201===e.statusCode?(commentTextarea.value="",commentTextarea.dispatchEvent(new Event("input")),commentWindow.scrollTop=0,loadedRealTimeComments+=1):console.error(e.jsonResponse.message)})).finally((()=>{commentButton.innerHTML="&#x27A4;",commentButton.disabled=!1,commentButton.style.cursor="pointer",toggleSpinner(commentButton,!1,"comment-spinner-send",!0)})))}));