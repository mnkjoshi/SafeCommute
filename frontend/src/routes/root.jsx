import { Outlet, useNavigate, useLocation } from "react-router-dom";
let currentRoute = 1;
let device = 1;
import React, { useState } from 'react'
import ImageCombiner from "../components/ImageCombiner.jsx";

export default function Root() {  
    const [status, setStatus] = useState(0);
    const [movement, setMove] = useState(0);
    const navigate = useNavigate();
    let dashBarTransition;

    
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
                    navigate("/login");
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
        <main className="w-full">
            <section className="pt-20 w-full justify-center items-center flex flex-col">
                <div className="absolute text-center w-full justify-center items-center flex flex-col">
                    <h1 className="gradient header">Welcome to SafeCommute</h1>
                </div>
                <button className={`z-10 absolute top-30 h-15 w-40 material-bubble text-white block border border-sky-50 rounded py-1.5 px-3`} onClick={() => {
                    navigate("/login");
                }}>
                    Enter
                </button>
            </section>
            <div className='absolute top-0 h-screen w-screen w-full'>
                <ImageCombiner className="absolute w-full h-full"
                    images={["images/output2.png", "images/output1.png", "images/output0.png"]}
                />
            </div>
        </main>
    );
  }