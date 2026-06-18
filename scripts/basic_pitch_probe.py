import sys
import os
import json
import subprocess

def probe_environment(input_file=None, output_dir=None):
    res = {
        "ok": True,
        "python": sys.executable,
        "pythonVersion": ".".join(map(str, sys.version_info[:3])),
        "basicPitchInstalled": False,
        "basicPitchVersion": "None",
        "cliAvailable": False,
        "librosaInstalled": False,
        "numpyInstalled": False,
        "tensorflowInstalled": False,
        "midoInstalled": False,
        "ffmpegInstalled": False,
        "inputFileExists": False,
        "outputDirReady": False,
        "blockers": []
    }

    # 1. Check basic_pitch import
    try:
        import basic_pitch
        res["basicPitchInstalled"] = True
        try:
            res["basicPitchVersion"] = getattr(basic_pitch, "__version__", "Unknown")
        except AttributeError:
            res["basicPitchVersion"] = "Unknown"
    except Exception as e:
        res["blockers"].append(f"basic_pitch library is not installed or failed to import: {str(e)}")

    # 2. Check key dependency libraries
    try:
        import librosa
        res["librosaInstalled"] = True
    except Exception:
        res["blockers"].append("librosa is not installed.")

    try:
        import numpy
        res["numpyInstalled"] = True
    except Exception:
        res["blockers"].append("numpy is not installed.")

    try:
        import tensorflow
        res["tensorflowInstalled"] = True
    except Exception:
        pass # Note: basic_pitch might run on light-onnx or tflite, or standard tensorflow depending on version. Do not treat as critical blocker if basic_pitch itself loaded.

    try:
        import mido
        res["midoInstalled"] = True
    except Exception:
        res["blockers"].append("mido library is not installed.")

    # 3. Check CLI tool "basic-pitch"
    try:
        # Try running `basic-pitch --help` or searching in PATH
        # Since we might be running inside virtual env, we'll run using subprocess
        # Search relative to python executable first
        py_dir = os.path.dirname(sys.executable)
        paths_to_check = ["basic-pitch", "basic_pitch"]
        for p in [os.path.join(py_dir, "basic-pitch"), os.path.join(py_dir, "basic-pitch.exe"), "basic-pitch"]:
            try:
                # Use shell=True/False depending on OS
                # Let's verify if basic-pitch run returns anything
                out = subprocess.run([p, "--help"], capture_output=True, text=True, timeout=3)
                if out.returncode == 0 or "basic-pitch" in out.stdout or "basic-pitch" in out.stderr or out.returncode == 2:
                    res["cliAvailable"] = True
                    break
            except Exception:
                continue
        
        # If still not found, try as sub-module "python -m basic_pitch"
        if not res["cliAvailable"]:
            try:
                # Test call with python module
                out = subprocess.run([sys.executable, "-m", "basic_pitch", "--help"], capture_output=True, text=True, timeout=3)
                if out.returncode == 0 or "basic-pitch" in out.stdout or "basic-pitch" in out.stderr or out.returncode == 2:
                    res["cliAvailable"] = True
            except Exception:
                pass
    except Exception:
        pass

    if not res["cliAvailable"]:
        res["blockers"].append("basic-pitch command line utility (CLI) was not found in active environment.")

    # 4. Input file verification
    if input_file:
        file_abs = os.path.abspath(input_file)
        if os.path.isfile(file_abs):
            res["inputFileExists"] = True
            file_size = os.path.getsize(file_abs)
            if file_size == 0:
                res["blockers"].append(f"Input audio file is empty (0 bytes): {input_file}")
        else:
            res["blockers"].append(f"Input audio file does not exist: {input_file}")
    else:
        res["blockers"].append("No input audio file specified in preflight parameter.")

    # 5. Output folder verification and creation
    if output_dir:
        out_abs = os.path.abspath(output_dir)
        try:
            os.makedirs(out_abs, exist_ok=True)
            if os.path.exists(out_abs) and os.access(out_abs, os.W_OK):
                res["outputDirReady"] = True
            else:
                res["blockers"].append(f"Output directory exists but is not writable: {out_abs}")
        except Exception as e:
            res["blockers"].append(f"Failed to create or access output directory: {str(e)}")
    else:
        res["blockers"].append("No output directory specified.")

    # 6. Check FFmpeg in environment
    try:
        # Check standard ffmpeg
        import shutil
        if shutil.which("ffmpeg"):
            res["ffmpegInstalled"] = True
        else:
            try:
                out = subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=2)
                if out.returncode == 0:
                    res["ffmpegInstalled"] = True
            except Exception:
                pass
    except Exception:
        pass

    if not res["ffmpegInstalled"]:
        # Do not block completely if librosa could decode, but report as warning/blocker or log item
        pass

    if res["blockers"]:
        res["ok"] = False

    return res

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=str, default=None)
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()

    probe_results = probe_environment(args.input, args.output)
    print(json.dumps(probe_results, indent=2))
