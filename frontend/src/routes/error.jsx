import { useNavigate, useRouteError } from "react-router-dom";


export default function ErrorPage() {  
    const Navigation = useNavigate();

    let error = useRouteError();
    setTimeout(function() { 
        Navigation(-1);
    }, 2000     )

    return (
        <div>
            <p className="error-main">
                An error was detected: {error.error.message}
                
            </p>
            <p className="error-main">
               Sending you back momentarily.
                
            </p>
        </div>
    );
  }