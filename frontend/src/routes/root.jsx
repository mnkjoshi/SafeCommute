import { Outlet, useNavigate, useLocation } from "react-router-dom";
let currentRoute = 1;
let device = 1;
let transferring = false;
import React, { useState } from 'react'

export default function Root() {  
    const [status, setStatus] = useState(0);
    const [first, setFirst] = useState(0);
    const [movement, setMove] = useState(0);
    let location = useLocation();
    const navigate = useNavigate();
    let dashBarTransition;

    if (window.innerWidth <= 700) { // Mobile
        dashBarTransition = "translateY(-5px)"
        device = 2;
    } else { // PC
        dashBarTransition = "translateX(10px)"
        device = 1;
    }


    
    function Navigation(Route) {
        if (currentRoute == Route) { return }

        setTimeout(function() {
            switch (Route) {
                case -1:
                    navigate("/", true);
                    break;
                case 1:
                    navigate("/", true);
                    break;
                case 2:
                    navigate("/projects");
                    break;
                case 3:
                    navigate("/cyber");
                    break;
                case 4:
                    navigate("/resume");
                    break;
                case 5:
                    navigate("/resources");
                    break;
                case 6:
                    navigate("/portal");
                    break;
            }
            if (Route !== 1 && Route !== -1 && device == 1) {
                activateToggles("0", dashBarTransition, 100);
                deleter("Manav Joshi".length);      
                currentRoute = Route
                transferring = true;
                if (status == 1) {
                    setMove(movement + 1);
                } else {
                    setStatus(1);
                }
                setTimeout(function() { 
                    if (currentRoute !== 1) {
                        document.getElementById("landing-switches").style.width = "0%";
                    }
                    document.getElementById("landing-outlet").style.opacity = 1;
                    transferring = false;
                }, 2000)
            } else if ((Route == 1 || Route == -1)  && device == 1) {
                transferring = false;
                document.getElementById("landing-switches").style.width = "18%";
                activateToggles("1", dashBarTransition, 100);
                typer("Manav Joshi", 0);
                currentRoute = 1    
                setStatus(0);
            }
        }, timeToWait)
    }
    
    return (
        <div className= "landing-main" id= "landing-main">
            <p className= "contact-details"> mnjoshi+w@ualberta.ca </p>
            <div className= "landing-central">
                <p className= "landing-welcome" id= "landing-welcome"></p>
            </div>
            <div className= "landing-outlet" id= "landing-outlet">
                <Outlet/>
            </div>
      </div>
    );
  }