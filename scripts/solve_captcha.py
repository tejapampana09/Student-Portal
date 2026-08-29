import sys
import os
import numpy as np
from PIL import Image

try:
    import ai_edge_litert.interpreter as tflite
except ImportError:
    try:
        import tflite_runtime.interpreter as tflite
    except ImportError:
        import tensorflow.lite as tflite

CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"

def solve(image_bytes, model_path):
    interpreter = tflite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    import io
    img = Image.open(io.BytesIO(image_bytes)).convert("L")
    img = img.crop((0, 0, 120, 25))
    
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = np.expand_dims(arr, axis=(0, -1)) # Shape (1, 25, 120, 1)

    interpreter.set_tensor(input_details[0]['index'], arr)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details[0]['index'])

    flat_output = output.flatten()
    result = ""
    for char_idx in range(5):
        offset = char_idx * 37
        class_idx = np.argmax(flat_output[offset:offset+37])
        result += CHARS[class_idx]
    
    return result.replace("_", "")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        image_bytes = sys.stdin.buffer.read()
    else:
        with open(sys.argv[1], "rb") as f:
            image_bytes = f.read()

    # Search for model in various standard relative locations
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "..", "src", "static", "captcha", "model", "captcha_float32.tflite"),
        os.path.join(os.path.dirname(__file__), "src", "static", "captcha", "model", "captcha_float32.tflite"),
        os.path.join(os.getcwd(), "src", "static", "captcha", "model", "captcha_float32.tflite"),
    ]

    model_path = next((p for p in possible_paths if os.path.exists(p)), possible_paths[0])
    print(solve(image_bytes, model_path))
