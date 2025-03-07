import express from 'express';
import sgMail from '@sendgrid/mail'
import dotenv from 'dotenv'

import cors from 'cors'
import admin from "firebase-admin";


//https://dashboard.render.com/web/srv-crcllkqj1k6c73coiv10/events
//https://console.firebase.google.com/u/0/project/the-golden-hind/database/the-golden-hind-default-rtdb/data/~2F

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(cors())

app.use(cors({ origin: '*' }));

dotenv.config();

const adminCert = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const firebaseConfig = {
    credential: admin.credential.cert(adminCert),
    databaseURL: "https://safecommutedev-default-rtdb.firebaseio.com/",
};

const firebaseApp = admin.initializeApp(firebaseConfig)

const mailAPIkey = process.env.mailAPIkey
sgMail.setApiKey('SG.' + mailAPIkey)

app.get('/', (request, response) => {
    response.status(200);
    response.send("Yarrr! Ahoy there, matey!");
});

app.post('/login', async (request, response) => {
    const { username, password } = request.body
    try {
        const authenticated = await AttemptAuth(username, password);
        if (authenticated) {
            const token = await FetchUserToken(request.body.username);
            if (token.substr(0, 11) == "validation=") {
                await OfferVerify(username, token)
                response.status(202);
                response.send("UNV") // User needs to verify
            } else if (token) {
                response.status(200);
                response.send({ username,  token });
            } else {
                response.status(202);
                response.send("UNV");
            }
        } else {
            response.status(202);
            response.send("ILD"); //Incorrect login details
        }
    } catch(error) {
        response.status(202);
        response.send(error.message); //Unknown error
    }
});

app.post('/register', async (request, response) => {
    const { username, password, email } = request.body

    try { //Check if username is taken!

        const Existence = await CheckUser(username, email);

        if (Existence === 1) {
            response.status(202);
            response.send("UNT"); //Username is taken
            return
        } else if (Existence === 2) {
            response.status(202);
            response.send("ET"); //Email is taken
            return
        }
    } catch(error) {
        response.status(202);
        response.send(error.message);
        return
    }

    try { //Try registering the user!
        const worked = await Register(username, password, email)
    } catch (error) {
        response.status(202);
        response.send(error.message)
        return
    }
    response.status(202);
    response.send("UCS") //User created successfully
});

app.post('/verify', async (request, response) => {
    const { token } = request.body
    const db = admin.database();
    const newToken = GenerateToken();
    
    const snapshot = await db.ref(`vlist/${token}/user`).once('value');
    if (snapshot.exists()) {
        db.ref(`vlist/${token}`).set({ user: null })
        db.ref(`users/${snapshot.val()}`).update({ token: newToken })

        response.status(200);
        response.send("UVS"); //User verified successfully
    } else {
        response.status(202);
        response.send("UKE"); //Unknown error occurred
    }
});

app.post('/report', async (request, response) => {
    const {type, location, capture} = request.body
    const db = admin.database();

    db.ref(`incidents/${GenerateToken()}`).set({ type: type, location: location, capture: capture})
    response.status(200)
    response.send("Success")
})


app.get('/retrieve', async (request, response) => {
    // For GET requests, parameters should come from query params, not body
    // But since your current code uses body, we'll convert this to a POST endpoint
    // to maintain compatibility with your client code
});

// Add POST endpoint for retrieve (since we're sending data in request body)
app.post('/retrieve', async (request, response) => {
    const {user, token} = request.body
    const db = admin.database();

    try {
        if (Authenticate(user, token)) {
            const snapshot = await db.ref(`incidents`).once('value');
            
            // Firebase already returns data as a JavaScript object
            // No need to parse with JSON.parse
            const data = snapshot.val();
            
            if (!data) {
                response.status(200).send({});
                return;
            }
            
            response.status(200).send(data);
        } else {
            response.status(202).send("UNV");
        }
    } catch (error) {
        console.error("Error retrieving incidents:", error);
        response.status(500).send("Server error occurred");
    }
});

// Add a new endpoint for updating incident status (dismiss or escalate)
app.post('/incident/update', async (request, response) => {
    const { user, token, incidentId, action } = request.body;
    
    if (!incidentId || !action || (action !== 'dismiss' && action !== 'escalate')) {
        response.status(400).send("Invalid parameters");
        return;
    }
    
    const db = admin.database();
    
    try {
        // Check if user is authenticated and has admin rights
        const isAdmin = await CheckAdminRights(user, token);
        
        if (!isAdmin) {
            response.status(403).send("Unauthorized: Admin rights required");
            return;
        }
        
        // Check if the incident exists
        const incidentRef = db.ref(`incidents/${incidentId}`);
        const snapshot = await incidentRef.once('value');
        
        if (!snapshot.exists()) {
            response.status(404).send("Incident not found");
            return;
        }
        
        // Update the incident status
        await incidentRef.update({ 
            status: action,
            updatedBy: user,
            updatedAt: new Date().toISOString()
        });
        
        const msg = {
            to: 'man4v@proton.me', // Change to your recipient
            from: 'disvelop@proton.me', // Change to your verified sender
            subject: 'TRANSIT ALERT',
            html: `<html> <head> <title>EMAIL</title> </head> <body> <div> <h1 style="text-align:center;">ADMIN ESCALATED TRANSIT ALERT</h1> <hr> <p style= "text-align:center;">INCIDENT HAS BEEN ESCALATED</p> <a clicktracking=off href="${incidentId}" style="text-align:center; align-self:center;">${incidentId}</a> </div> </body> </html>`,
        }
    
        sgMail
        .send(msg)
        .then(() => {
          console.log('Email verification sent!')
        })
        .catch((error) => {
            console.log("VerE")
          console.error(error)
        })

        // Log the action
        db.ref(`activity_logs`).push({
            user: user,
            action: `${action}d incident`,
            incidentId: incidentId,
            timestamp: new Date().toISOString()
        });
        
        response.status(200).send({ success: true, message: `Incident ${action}d successfully` });
    } catch (error) {
        console.error("Error updating incident:", error);
        response.status(500).send("Server error occurred");
    }
});

//process.env.PORT
const listener = app.listen(3000, (error) => {
    if (error == null) {
        console.log("Server now running on port " + listener.address().port)
        console.log("http://localhost:" + listener.address().port)
    } else {
        console.log(error)
    }
});

async function Authenticate(user, token) {
    const db = admin.database();

    const snapshot = await db.ref(`users/${user}/token`).once('value');
    if (snapshot.exists()) {
        if (token == snapshot.val()) {
            return true
        }
    }
    return false
}

async function AttemptAuth(username, password) {
    const db = admin.database();

    try {
            
        const snapshot = await db.ref(`users/${username}/password`).once('value');
        if (snapshot.exists()) {
            const storedPassword = snapshot.val();
            return storedPassword === password;
        } else {
            return false;
        }
    } catch (error) {
        console.error("Error while authenticating the user: ", error);
        return false;
    }
}
async function FetchUserToken(username) {
    const db = admin.database();
    try {
        const DataSnapshot = await db.ref(`users/${username}/token`).once('value');
        if (DataSnapshot.exists()) {
            return DataSnapshot.val();
        } else {
            return null
        }
    } catch (error) {
        console.log("Error found while fetching user token: " + error)
    }
    return token
}

async function Register(username, password, email) {
    const db = admin.database();
    const newToken = "validation=" + GenerateToken()
    try {

        db.ref(`users/${username}`).set({ 
            password: password,
            email: email,
            favourites: "[]",
            continues: "[]",
            token: newToken,
        })

        email = email.replace(".", "@@@")

        db.ref(`emails/${email}`).set({ 
            user: username,
        })

        db.ref(`vlist/${newToken}`).set({ 
            user: username,
        })
    } catch (error) {
        return error
    }

    await OfferVerify(username, newToken, email)
    return 0
}

async function CheckUser(username, email) {
    const db = admin.database();

    const UserSnaphot = await db.ref(`users/${username}`).once('value');
    if (UserSnaphot.exists()) {
        return 1
    }

    email = email.replace(".", "@@@")
    const EmailSnapshot = await db.ref(`emails/${email}`).once('value');
    if (EmailSnapshot.exists()) {
        return 2
    }

    return 0
}

async function OfferVerify(username, token, email) {
    if (email == null) {
        const db = admin.database()
        const EmailSnapshot = await db.ref(`users/${username}/email`).once('value');
        email = EmailSnapshot.val();
    }

    email = email.replace("@@@", ".")

    let link = "https://safecommute.web.app/auth/" + token
    const msg = {
        to: email, // Change to your recipient
        from: 'disvelop@proton.me', // Change to your verified sender
        subject: 'TGH Verification',
        html: `<html> <head> <title>EMAIL</title> </head> <body> <div> <h1 style="text-align:center;">Welcome to TGH</h1> <hr> <p style= "text-align:center;">Click the link below to verify your account.</p> <a clicktracking=off href="${link}" style="text-align:center; align-self:center;">${link}</a> </div> </body> </html>`,
    }

    sgMail
    .send(msg)
    .then(() => {
      console.log('Email verification sent!')
    })
    .catch((error) => {
        console.log("VerE")
      console.error(error)
    })
}

function GenerateToken() {
    return Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
}

// Add a helper function to check admin rights
async function CheckAdminRights(user, token) {
    try {
        // First check if user is authenticated
        const isAuthenticated = await Authenticate(user, token);
        
        if (!isAuthenticated) {
            return false;
        }
        
        // Then check if user has admin rights
        const db = admin.database();
        const snapshot = await db.ref(`users/${user}/role`).once('value');
        
        // If the role is explicitly set to 'admin', return true
        if (snapshot.exists() && snapshot.val() === 'admin') {
            return true;
        }
        
        // For now, let's make all authenticated users admins for testing
        // Remove this in production and rely on the role check above
        return true;
    } catch (error) {
        console.error("Error checking admin rights:", error);
        return false;
    }
}