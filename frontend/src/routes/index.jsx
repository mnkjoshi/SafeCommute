import { useNavigate } from "react-router-dom";
import Cookies from 'js-cookie';
let currentMessage = 0


export default function Index() {  
    setTimeout( function() {
        document.getElementById("index-content").style.opacity = "1";
        document.getElementById("index-content").style.transform = "translateY(10px)";
    }, 1000)

    setTimeout( function() {
        deleter(allMessages[currentMessage].length)
    }, 1500)
    return (
        <div className= "index-main">
            <div className = "index-content" id= "index-content">
            </div>
        </div>
    );
  }