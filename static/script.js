// =====================================================
// ELEMENTS
// =====================================================

const imageInput = document.getElementById("imageInput");
const openCamera = document.getElementById("openCamera");
const closeCamera = document.getElementById("closeCamera");
const flipCamera = document.getElementById("flipCamera");
const capturePhoto = document.getElementById("capturePhoto");

const video = document.getElementById("video");
const cameraSection = document.getElementById("cameraSection");

const previewSection = document.getElementById("previewSection");
const previewImage = document.getElementById("previewImage");

const predictBtn = document.getElementById("predictBtn");
const loading = document.getElementById("loading");

const resultSection = document.getElementById("resultSection");
const predictionDigit = document.getElementById("predictionDigit");
const confidence = document.getElementById("confidence");
const confidenceFill = document.getElementById("confidenceFill");

const processedImage = document.getElementById("processedImage");
const probabilities = document.getElementById("probabilities");


// =====================================================
// VARIABLES
// =====================================================

let stream = null;
let selectedFile = null;

// Start with BACK camera
let facingMode = "environment";


// =====================================================
// CHECK CAMERA SUPPORT
// =====================================================

function cameraSupported() {

    if (!window.isSecureContext) {

        console.warn(
            "Current page is not a secure context:",
            window.location.href
        );

    }

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        return false;
    }

    return true;
}


// =====================================================
// UPLOAD IMAGE
// =====================================================

if (imageInput) {

    imageInput.addEventListener(
        "change",
        function () {

            const file = this.files[0];

            if (!file) {
                return;
            }

            selectedFile = file;

            showPreview(file);

        }
    );

}


// =====================================================
// SHOW PREVIEW
// =====================================================

function showPreview(file) {

    const url = URL.createObjectURL(file);

    previewImage.src = url;

    previewSection.classList.remove("hidden");

    resultSection.classList.add("hidden");

    window.scrollTo({

        top:
            previewSection.offsetTop - 20,

        behavior:
            "smooth"

    });

}


// =====================================================
// OPEN CAMERA
// =====================================================

if (openCamera) {

    openCamera.addEventListener(
        "click",
        async function () {

            // Check browser support

            if (!cameraSupported()) {

                alert(
                    "Camera is not available.\n\n" +
                    "Please open the Flask application in Chrome " +
                    "using http://127.0.0.1:5000"
                );

                return;
            }


            cameraSection.classList.remove(
                "hidden"
            );


            try {

                await startCamera();

            }

            catch (error) {

                console.error(
                    "Camera error:",
                    error
                );

                cameraSection.classList.add(
                    "hidden"
                );

                showCameraError(error);

            }

        }
    );

}


// =====================================================
// START CAMERA
// =====================================================

async function startCamera() {

    // Stop old camera first

    stopCamera();


    // =================================================
    // CAMERA CONSTRAINTS
    // =================================================

    const constraints = {

        audio: false,

        video: {

            facingMode: facingMode,

            width: {
                ideal: 1280
            },

            height: {
                ideal: 720
            }

        }

    };


    console.log(
        "Requesting camera:",
        facingMode
    );


    try {

        // Request camera

        stream =
            await navigator.mediaDevices
                .getUserMedia(
                    constraints
                );

    }

    catch (error) {

        console.error(
            "getUserMedia error:",
            error.name,
            error.message
        );

        throw error;

    }


    // =================================================
    // CONNECT CAMERA TO VIDEO
    // =================================================

    video.srcObject = stream;


    video.autoplay = true;

    video.playsInline = true;

    video.muted = true;


    // =================================================
    // WAIT FOR VIDEO
    // =================================================

    await new Promise(
        function (resolve) {

            if (
                video.readyState >= 2
            ) {

                resolve();

                return;
            }


            video.onloadedmetadata =
                function () {

                    resolve();

                };

        }
    );


    // Start video

    try {

        await video.play();

    }

    catch (error) {

        console.warn(
            "Video play warning:",
            error
        );

    }


    console.log(
        "Camera started successfully"
    );

    console.log(
        "Camera:",
        facingMode
    );

}


// =====================================================
// CAMERA ERROR MESSAGE
// =====================================================

function showCameraError(error) {

    let message = "Unable to open camera.";


    // Permission denied

    if (
        error.name ===
        "NotAllowedError"
    ) {

        message =
            "Camera permission was denied.\n\n" +

            "In Chrome:\n" +

            "1. Click the camera/lock icon near the address bar.\n" +

            "2. Set Camera to Allow.\n" +

            "3. Refresh the page.\n\n" +

            "Also check Windows Camera permission.";

    }


    // No camera

    else if (
        error.name ===
        "NotFoundError"
    ) {

        message =
            "No camera was found on this device.";

    }


    // Camera busy

    else if (
        error.name ===
        "NotReadableError"
    ) {

        message =
            "The camera is already being used by another application.\n\n" +

            "Close apps such as:\n" +

            "Zoom\n" +
            "Teams\n" +
            "Camera\n" +
            "WhatsApp";

    }


    // Camera constraint problem

    else if (
        error.name ===
        "OverconstrainedError"
    ) {

        message =
            "The selected camera is not available.\n\n" +

            "Try the Flip Camera button.";

    }


    // Security

    else if (
        error.name ===
        "SecurityError"
    ) {

        message =
            "Chrome blocked camera access because of browser security.";

    }


    // Generic

    else {

        message =
            "Unable to access the camera.\n\n" +

            "Error: " +
            error.name +
            "\n\n" +

            error.message;

    }


    alert(message);

}


// =====================================================
// FLIP CAMERA
// =====================================================

if (flipCamera) {

    flipCamera.addEventListener(
        "click",
        async function () {

            // Make sure camera is active

            if (!stream) {

                alert(
                    "Please open the camera first."
                );

                return;
            }


            // =================================================
            // CHANGE CAMERA
            // =================================================

            if (
                facingMode ===
                "environment"
            ) {

                facingMode = "user";

            }

            else {

                facingMode = "environment";

            }


            console.log(
                "Switching camera to:",
                facingMode
            );


            try {

                await startCamera();

            }

            catch (error) {

                console.error(
                    "Flip camera error:",
                    error
                );


                // Try switching back

                if (
                    facingMode ===
                    "environment"
                ) {

                    facingMode = "user";

                }

                else {

                    facingMode = "environment";

                }


                alert(
                    "Unable to switch camera.\n\n" +
                    "This device may only have one camera."
                );

            }

        }
    );

}


// =====================================================
// CAPTURE PHOTO
// =====================================================

if (capturePhoto) {

    capturePhoto.addEventListener(
        "click",
        function () {

            if (!stream) {

                alert(
                    "Camera is not active."
                );

                return;
            }


            // =================================================
            // GET VIDEO SIZE
            // =================================================

            const width =
                video.videoWidth;

            const height =
                video.videoHeight;


            if (
                width === 0 ||
                height === 0
            ) {

                alert(
                    "Camera is not ready.\n\n" +
                    "Please wait for the camera preview."
                );

                return;
            }


            // =================================================
            // CREATE CANVAS
            // =================================================

            const canvas =
                document.createElement(
                    "canvas"
                );


            canvas.width =
                width;

            canvas.height =
                height;


            const context =
                canvas.getContext(
                    "2d"
                );


            // =================================================
            // FRONT CAMERA
            // =================================================

            if (
                facingMode ===
                "user"
            ) {

                context.translate(
                    width,
                    0
                );

                context.scale(
                    -1,
                    1
                );

            }


            // =================================================
            // DRAW IMAGE
            // =================================================

            context.drawImage(

                video,

                0,
                0,

                width,
                height

            );


            // =================================================
            // CONVERT CANVAS TO FILE
            // =================================================

            canvas.toBlob(

                function (blob) {

                    if (!blob) {

                        alert(
                            "Unable to capture image."
                        );

                        return;
                    }


                    selectedFile =
                        new File(

                            [blob],

                            "camera-digit.jpg",

                            {
                                type:
                                    "image/jpeg"
                            }

                        );


                    // =================================================
                    // SHOW PREVIEW
                    // =================================================

                    previewImage.src =
                        URL.createObjectURL(
                            selectedFile
                        );


                    previewSection.classList.remove(
                        "hidden"
                    );


                    // =================================================
                    // STOP CAMERA
                    // =================================================

                    stopCamera();


                    cameraSection.classList.add(
                        "hidden"
                    );


                    // =================================================
                    // SCROLL
                    // =================================================

                    window.scrollTo({

                        top:
                            previewSection.offsetTop - 20,

                        behavior:
                            "smooth"

                    });

                },

                "image/jpeg",

                0.95

            );

        }
    );

}


// =====================================================
// CLOSE CAMERA
// =====================================================

if (closeCamera) {

    closeCamera.addEventListener(
        "click",
        function () {

            stopCamera();

            cameraSection.classList.add(
                "hidden"
            );

        }
    );

}


// =====================================================
// STOP CAMERA
// =====================================================

function stopCamera() {

    if (stream) {

        stream
            .getTracks()
            .forEach(
                function (track) {

                    track.stop();

                }
            );

        stream = null;

    }


    if (video) {

        video.pause();

        video.srcObject = null;

    }

}


// =====================================================
// PREDICT
// =====================================================

if (predictBtn) {

    predictBtn.addEventListener(
        "click",
        async function () {

            if (!selectedFile) {

                alert(
                    "Please upload or capture an image first."
                );

                return;
            }


            // =================================================
            // FORM DATA
            // =================================================

            const formData =
                new FormData();


            formData.append(
                "image",
                selectedFile
            );


            // =================================================
            // LOADING
            // =================================================

            loading.classList.remove(
                "hidden"
            );


            resultSection.classList.add(
                "hidden"
            );


            try {

                // =================================================
                // SEND TO FLASK
                // =================================================

                const response =
                    await fetch(
                        "/predict",
                        {

                            method:
                                "POST",

                            body:
                                formData

                        }
                    );


                // =================================================
                // CHECK HTTP RESPONSE
                // =================================================

                if (!response.ok) {

                    throw new Error(
                        "Server error: " +
                        response.status
                    );

                }


                const data =
                    await response.json();


                // =================================================
                // CHECK FLASK RESPONSE
                // =================================================

                if (!data.success) {

                    throw new Error(
                        data.error ||
                        "Prediction failed."
                    );

                }


                // =================================================
                // DIGIT
                // =================================================

                predictionDigit.textContent =
                    data.digit;


                // =================================================
                // CONFIDENCE
                // =================================================

                const confidenceValue =
                    Number(
                        data.confidence
                    );


                confidence.textContent =
                    confidenceValue.toFixed(
                        2
                    ) + "%";


                confidenceFill.style.width =
                    confidenceValue + "%";


                // =================================================
                // PROCESSED IMAGE
                // =================================================

                if (
                    data.processed_image
                ) {

                    processedImage.src =
                        data.processed_image;

                }


                // =================================================
                // PROBABILITIES
                // =================================================

                showProbabilities(
                    data.probabilities
                );


                // =================================================
                // SHOW RESULT
                // =================================================

                resultSection.classList.remove(
                    "hidden"
                );


                window.scrollTo({

                    top:
                        resultSection.offsetTop - 20,

                    behavior:
                        "smooth"

                });

            }


            catch (error) {

                console.error(
                    "Prediction error:",
                    error
                );


                alert(
                    "Prediction error:\n\n" +
                    error.message
                );

            }


            finally {

                loading.classList.add(
                    "hidden"
                );

            }

        }
    );

}


// =====================================================
// PROBABILITY BARS
// =====================================================

function showProbabilities(values) {

    probabilities.innerHTML = "";


    if (!values) {
        return;
    }


    values.forEach(
        function (value, digit) {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "probability-row";


            row.innerHTML = `

                <div class="probability-label">
                    ${digit}
                </div>

                <div class="probability-bar">

                    <div
                        class="probability-fill"
                        style="width:${value}%"
                    ></div>

                </div>

                <div>
                    ${Number(value).toFixed(2)}%
                </div>

            `;


            probabilities.appendChild(
                row
            );

        }
    );

}


// =====================================================
// PAGE CLOSE
// =====================================================

window.addEventListener(
    "beforeunload",
    function () {

        stopCamera();

    }
);
