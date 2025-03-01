import { useNavigate, useParams } from "react-router-dom";
import axios from 'axios'
import React, { useState, useEffect } from 'react' 

let infoToShow = "Nothing"
let infoType = "Error"
let NotificationCall
let notifyingLogin = false

export default function Auth() {  
    const [info, setInfo] = useState(0);
    const [status, setStatus] = useState(0);
    NotificationCall = setInfo
    const navigate = useNavigate();
    const { id } = useParams();
    let user = localStorage.getItem("user")

    useEffect(() => {
        if (!(user == null) && !notifyingLogin) {
            navigate('/dashboard')
        }
    })

    

    if(!(id == null)) {
      Verify(id, navigate)
    }

    return (
        <div className= "auth-main">
          {status == 0 ? <Login setStatus={setStatus} navigate={navigate}/> : <Registration setStatus={setStatus}/>}
          {info == 0 ? null : <Notification/>}
        </div>
    );
}

function Verify(Token, navigate) {
  axios({
    method: 'post',
    url: 'https://safecommute.onrender.com/verify',
    data: {
      token: Token,
    }
  }).then((response) => {
    console.log(response.data)
    if (response.data == "UVS") {
      Notify("Success", "Account verified! Please login.")
    } else {
      Notify("Error", "An unknown error occurred! Please try again later.")
    }
    navigate("/auth")
  });
}

function Notify(InfoType, Information) {
  infoToShow = Information
  infoType = InfoType
  NotificationCall(1)
  setTimeout(function() {
    document.getElementById("auth-notification").style.opacity = 1
  }, 10)
  setTimeout(function() {
    document.getElementById("auth-notification").style.opacity = 0;
    setTimeout(function() {
      NotificationCall(0)
    }, 300)
  }, 2700)
}

function Attempt(Which, Username, Password, Email, navigate) {
  if (Which == "Login") {
    if (Username == "" || Password == "") {
      Notify("Error", "Missing information!");
      return null
    }
    axios({
      method: 'post',
      url: 'https://safecommute.onrender.com/login',
      data: {
        username: Username,
        password: Password
      }
    }).then((response) => {
      console.log(response.status)
      if (response.status == 200) {
        localStorage.setItem("user", response.data.username)
        localStorage.setItem("token", response.data.token)
        notifyingLogin = true
        Notify("Success", `Hello admin, ${response.data.username}! Redirecting to SafeCommute dashboard.`)
        setTimeout(function() {
          notifyingLogin = false
          navigate("/dashboard")
        }, 2000)
      } else {
        console.log(response.data)
        switch (response.data) {
          case "UNV":
            Notify("Error", "Verify to login! Another email has been sent to your inbox.")
            break;
          case "ILD":
            Notify("Error", "Incorrect login details!")
            break;
          default:
            Notify("Error", "An unknown error has occurred!")
        }
      }
    });
  } else {
      if (Username == "" || Password == "" || Email == "") {
        Notify("Error", "Missing information!")
        return null
      }
      axios({
        method: 'post',
        url: 'https://safecommute.onrender.com/register',
        data: {
          username: Username,
          password: Password,
          email: Email,
        }
      }).then((response) => {
        console.log(response.status)
        console.log(response.data)
        switch (response.data) {
          case "UNT":
            Notify("Error", "Username is taken, try another name!")
            break;
          case "ET":
            Notify("Error", "Username is taken, try another name!", "This email account is already registered! Try logging in?")
            break;
          case "UCS":
            Notify("Success", "Account created successfully! Check your email and SPAM folder to verify!");
            break;
          default:
            Notify("Error", "An unknown error has occurred!")
        }
      });
  }
}

export function Notification() {
  let color = "#21982d";
  if (infoType == "Error") {
    color = "#982121"
  } else if(infoType == "Warn") {
    color = "#edd81b"
  }
  return (
    <div className= "auth-notification" id= "auth-notification" style={{backgroundColor: color}}>
      <p className= "auth-notification-info">{infoToShow}</p>
    </div>
  )
}

export function Login({setStatus, navigate}) {


  function KeyUpSearch(event) {
    console.log("Hi??")
    if (event.key == "Enter") {Attempt("Login", document.getElementById("auth-user-input").value, document.getElementById("auth-pass-input").value, null, navigate)}
  }

  return(
    <div className= "auth-holder">
      <p className= "auth-title gradient " id= "auth-title">Login</p>

      <div className= "auth-box" id= "username-entry">
        <p className= "auth-box-info" id= "auth-box-user">Username</p>
        <input className= "auth-box-input" id= "auth-user-input" onKeyUp={KeyUpSearch} autoComplete="off"></input>
      </div>

      <div className= "auth-box" id= "password-entry">
        <p className= "auth-box-info" id= "auth-box-pass">Password</p>
        <input className= "auth-box-input" id= "auth-pass-input" type= "password" onKeyUp={KeyUpSearch} autoComplete="off"></input>
      </div>

      <button className= "auth-entry" onClick={() => Attempt("Login", document.getElementById("auth-user-input").value, document.getElementById("auth-pass-input").value, null, navigate)}>ENTER</button>
      <button className= "auth-switch text-purple-400" onClick={() => setStatus(1)} onMouseEnter={() => document.getElementById("auth-switch-underline").style.width = "12%"} onMouseLeave={() => document.getElementById("auth-switch-underline").style.width = "0%"}>Don't have an account?</button>
      <div className= "auth-switch-underline" id= "auth-switch-underline"/>
    </div>
  );
}

export function Registration ({setStatus}) {

  function KeyUpSearch(event) {
    if (event.key == "Enter") {Attempt("Register", document.getElementById("auth-user-input").value, document.getElementById("auth-pass-input").value, document.getElementById("auth-email-input").value)}
  }

  return(
    <div className= "auth-holder">
      <p className= "auth-title gradient" id= "auth-title">Register</p>

      <div className= "auth-box" id= "username-entry">
        <p className= "auth-box-info" id= "auth-box-user">Username</p>
        <input className= "auth-box-input" id= "auth-user-input" onKeyUp={KeyUpSearch} autoComplete="off"></input>
      </div>

      <div className= "auth-box" id= "email-entry">
        <p className= "auth-box-info" id= "auth-box-email">Email</p>
        <input className= "auth-box-input" id= "auth-email-input" onKeyUp={KeyUpSearch} autoComplete="off"></input>
      </div>

      <div className= "auth-box" id= "password-entry">
        <p className= "auth-box-info" id= "auth-box-pass">Password</p>
        <input className= "auth-box-input" id= "auth-pass-input" type= "password" onKeyUp={KeyUpSearch} autoComplete="off"></input>
      </div>

      <button className= "auth-entry" onClick={() => Attempt("Register", document.getElementById("auth-user-input").value, document.getElementById("auth-pass-input").value, document.getElementById("auth-email-input").value)}>ENTER</button>
      <button className= "auth-switch" onClick={() => setStatus(0)} onMouseEnter={() => document.getElementById("auth-switch-underline").style.width = "12%"} onMouseLeave={() => document.getElementById("auth-switch-underline").style.width = "0%"}>Already have an account?</button>
      <div className= "auth-switch-underline" id= "auth-switch-underline"/>
    </div>
  );
}