from flask import Flask, render_template, request, jsonify

import tensorflow as tf
import joblib
import numpy as np
import pandas as pd
import cv2

from PIL import Image

import base64
import io


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)


# =========================================================
# FILE PATHS
# =========================================================

MODEL_PATH = "cnn_model.keras"
SCALER_PATH = "mnist_scaler.pkl"


# =========================================================
# LOAD MODEL
# =========================================================

print("====================================")
print("Loading CNN model...")

model = tf.keras.models.load_model(
    MODEL_PATH
)

print("CNN model loaded successfully.")


# =========================================================
# LOAD SCALER
# =========================================================

print("Loading scaler...")

scaler = joblib.load(
    SCALER_PATH
)

print("Scaler loaded successfully.")


# =========================================================
# MODEL INFORMATION
# =========================================================

print("====================================")
print("CNN MODEL INFORMATION")
print("====================================")

print(
    "Model input :",
    model.input_shape
)

print(
    "Model output:",
    model.output_shape
)

if hasattr(
    scaler,
    "n_features_in_"
):

    print(
        "Scaler features:",
        scaler.n_features_in_
    )

print("====================================")


# =========================================================
# IMAGE -> BASE64
# =========================================================

def image_to_base64(image):

    buffer = io.BytesIO()

    image.save(
        buffer,
        format="PNG"
    )

    encoded_image = base64.b64encode(
        buffer.getvalue()
    ).decode("utf-8")

    return (
        "data:image/png;base64,"
        + encoded_image
    )


# =========================================================
# PREPROCESS PHOTO
# =========================================================

def preprocess_photo(pil_image):

    # =====================================================
    # STEP 1
    # PIL IMAGE -> RGB NUMPY ARRAY
    # =====================================================

    img = np.array(
        pil_image.convert("RGB")
    )


    # =====================================================
    # STEP 2
    # DETECT BLUE PEN
    # =====================================================

    hsv = cv2.cvtColor(
        img,
        cv2.COLOR_RGB2HSV
    )


    # Blue color range
    lower_blue = np.array([
        80,
        30,
        20
    ])

    upper_blue = np.array([
        140,
        255,
        255
    ])


    blue_mask = cv2.inRange(
        hsv,
        lower_blue,
        upper_blue
    )


    # =====================================================
    # STEP 3
    # CHECK WHETHER BLUE PEN WAS FOUND
    # =====================================================

    blue_pixels = cv2.countNonZero(
        blue_mask
    )


    # =====================================================
    # STEP 4
    # BLUE PEN FOUND
    # =====================================================

    if blue_pixels > 100:

        binary = blue_mask

    else:

        # =================================================
        # STEP 5
        # FALLBACK FOR BLACK / DARK PEN
        # =================================================

        gray = cv2.cvtColor(
            img,
            cv2.COLOR_RGB2GRAY
        )


        # Slight blur
        gray = cv2.GaussianBlur(
            gray,
            (5, 5),
            0
        )


        # Threshold
        _, binary = cv2.threshold(
            gray,
            0,
            255,
            cv2.THRESH_BINARY_INV
            + cv2.THRESH_OTSU
        )


    # =====================================================
    # STEP 6
    # REMOVE SMALL NOISE
    # =====================================================

    kernel = np.ones(
        (2, 2),
        np.uint8
    )


    binary = cv2.morphologyEx(
        binary,
        cv2.MORPH_CLOSE,
        kernel
    )


    # =====================================================
    # STEP 7
    # FIND DIGIT
    # =====================================================

    coords = cv2.findNonZero(
        binary
    )


    if coords is None:

        raise ValueError(
            "Could not detect a handwritten digit."
        )


    # =====================================================
    # STEP 8
    # FIND BOUNDING BOX
    # =====================================================

    x, y, w, h = cv2.boundingRect(
        coords
    )


    # =====================================================
    # STEP 9
    # CROP ONLY DIGIT
    # =====================================================

    digit = binary[
        y:y + h,
        x:x + w
    ]


    # =====================================================
    # STEP 10
    # ADD PADDING
    # =====================================================

    padding = 4


    digit = cv2.copyMakeBorder(
        digit,
        padding,
        padding,
        padding,
        padding,
        cv2.BORDER_CONSTANT,
        value=0
    )


    # =====================================================
    # STEP 11
    # RESIZE DIGIT
    # =====================================================

    h, w = digit.shape


    if h >= w:

        new_h = 20

        new_w = max(
            1,
            int(
                w * 20 / h
            )
        )

    else:

        new_w = 20

        new_h = max(
            1,
            int(
                h * 20 / w
            )
        )


    digit = cv2.resize(
        digit,
        (
            new_w,
            new_h
        ),
        interpolation=cv2.INTER_AREA
    )


    # =====================================================
    # STEP 12
    # CREATE 28x28 MNIST CANVAS
    # =====================================================

    canvas = np.zeros(
        (28, 28),
        dtype=np.uint8
    )


    # =====================================================
    # STEP 13
    # CENTER DIGIT
    # =====================================================

    x_offset = (
        28 - new_w
    ) // 2

    y_offset = (
        28 - new_h
    ) // 2


    canvas[
        y_offset:y_offset + new_h,
        x_offset:x_offset + new_w
    ] = digit


    # =====================================================
    # STEP 14
    # CONVERT 28x28 -> 784
    # =====================================================

    flat = canvas.reshape(
        1,
        784
    ).astype(
        np.float32
    )


    # =====================================================
    # STEP 15
    # APPLY SAME SCALER USED DURING TRAINING
    # =====================================================

    if hasattr(
        scaler,
        "feature_names_in_"
    ):

        flat_df = pd.DataFrame(
            flat,
            columns=scaler.feature_names_in_
        )

        scaled = scaler.transform(
            flat_df
        )

    else:

        scaled = scaler.transform(
            flat
        )


    # =====================================================
    # STEP 16
    # CONVERT TO CNN FORMAT
    # =====================================================

    model_input = scaled.reshape(
        1,
        28,
        28,
        1
    ).astype(
        np.float32
    )


    # =====================================================
    # RETURN
    # =====================================================

    return (
        model_input,
        canvas
    )


# =========================================================
# HOME PAGE
# =========================================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# =========================================================
# PREDICTION API
# =========================================================

@app.route(
    "/predict",
    methods=["POST"]
)
def predict():

    try:

        # =================================================
        # STEP 1
        # CHECK IMAGE
        # =================================================

        if "image" not in request.files:

            return jsonify({

                "success": False,

                "error":
                    "No image uploaded"

            }), 400


        file = request.files["image"]


        if file.filename == "":

            return jsonify({

                "success": False,

                "error":
                    "No image selected"

            }), 400


        # =================================================
        # STEP 2
        # OPEN IMAGE
        # =================================================

        image = Image.open(
            file.stream
        )


        # =================================================
        # STEP 3
        # PREPROCESS
        # =================================================

        model_input, processed_image = \
            preprocess_photo(
                image
            )


        # =================================================
        # STEP 4
        # CNN PREDICTION
        # =================================================

        prediction = model.predict(
            model_input,
            verbose=0
        )[0]


        # =================================================
        # STEP 5
        # GET PREDICTED DIGIT
        # =================================================

        predicted_digit = int(
            np.argmax(
                prediction
            )
        )


        # =================================================
        # STEP 6
        # CONFIDENCE
        # =================================================

        confidence = (
            float(
                prediction[
                    predicted_digit
                ]
            )
            * 100
        )


        # =================================================
        # STEP 7
        # ALL PROBABILITIES
        # =================================================

        probabilities = [

            round(
                float(p) * 100,
                2
            )

            for p in prediction

        ]


        # =================================================
        # STEP 8
        # TOP 3 PREDICTIONS
        # =================================================

        top_indices = np.argsort(
            prediction
        )[::-1][:3]


        top3 = []


        for index in top_indices:

            top3.append({

                "digit":
                    int(index),

                "probability":
                    round(
                        float(
                            prediction[index]
                        ) * 100,
                        2
                    )

            })


        # =================================================
        # STEP 9
        # CONVERT PROCESSED IMAGE TO BASE64
        # =================================================

        processed_pil = Image.fromarray(
            processed_image
        )


        processed_base64 = \
            image_to_base64(
                processed_pil
            )


        # =================================================
        # STEP 10
        # RESPONSE TO JAVASCRIPT
        # =================================================

        return jsonify({

            "success": True,

            "digit":
                predicted_digit,

            "confidence":
                round(
                    confidence,
                    2
                ),

            "probabilities":
                probabilities,

            "top3":
                top3,

            "processed_image":
                processed_base64

        })


    except Exception as e:

        print(
            "===================================="
        )

        print(
            "PREDICTION ERROR:",
            str(e)
        )

        print(
            "===================================="
        )


        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# =========================================================
# RUN FLASK
# =========================================================

if __name__ == "__main__":

    app.run(

        host="0.0.0.0",

        port=5000,

        debug=True

    )