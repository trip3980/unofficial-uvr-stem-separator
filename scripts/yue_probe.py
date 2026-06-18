import sys
import os
import json

def probe_environment(yue_root=None, output_dir=None):
    res = {
        "ok": True,
        "python": sys.executable,
        "pythonVersion": ".".join(map(str, sys.version_info[:3])),
        "torchInstalled": False,
        "torchVersion": "None",
        "cudaAvailable": False,
        "cudaDeviceName": None,
        "cudaVersion": "None",
        "transformersInstalled": False,
        "transformersVersion": "None",
        "flashAttentionInstalled": False,
        "yueRootExists": False,
        "inferPyExists": False,
        "requirementsStatus": "Not fully checked",
        "blockers": []
    }

    # 1. Check PyTorch
    try:
        import torch
        res["torchInstalled"] = True
        res["torchVersion"] = torch.__version__
        res["cudaAvailable"] = torch.cuda.is_available() if hasattr(torch, "cuda") else False
        if res["cudaAvailable"]:
            res["cudaDeviceName"] = torch.cuda.get_device_name(0)
            res["cudaVersion"] = getattr(torch.version, "cuda", "Unknown")
    except Exception as e:
        res["blockers"].append(f"PyTorch is not installed or failed to import: {str(e)}")

    # 2. Check Transformers
    try:
        import transformers
        res["transformersInstalled"] = True
        res["transformersVersion"] = transformers.__version__
    except Exception as e:
        res["blockers"].append("Transformers (Hugging Face) is not installed.")

    # 3. Check Flash Attention (optional but recommended)
    try:
        import flash_attn
        res["flashAttentionInstalled"] = True
    except Exception:
        pass  # Optional requirement, not necessarily a hard blocker for fallback execution

    # 4. Check YuE Root and inference file
    if yue_root:
        yue_root_abs = os.path.abspath(yue_root)
        if os.path.isdir(yue_root_abs):
            res["yueRootExists"] = True
            infer_path = os.path.join(yue_root_abs, "inference", "infer.py")
            if os.path.isfile(infer_path):
                res["inferPyExists"] = True
            else:
                res["blockers"].append("inference/infer.py execution script is missing inside yue-root folder.")
        else:
            res["blockers"].append(f"YuE root directory path does not exist: {yue_root_abs}")
    else:
        res["blockers"].append("YuE root directory path was not custom selected.")

    # 5. Check if output directory is writable
    if output_dir:
        out_abs = os.path.abspath(output_dir)
        if os.path.exists(out_abs):
            if not os.access(out_abs, os.W_OK):
                res["blockers"].append(f"Output directory is not writable: {out_abs}")
        else:
            try:
                os.makedirs(out_abs, exist_ok=True)
            except Exception as e:
                res["blockers"].append(f"Output directory could not be created: {str(e)}")

    if res["blockers"]:
        res["ok"] = False
        res["requirementsStatus"] = "Verification issues detected. Preflight check failed."
    else:
        res["requirementsStatus"] = "All requirements verified. System ready."

    return res

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--yue-root", type=str, default=None)
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()

    probe_results = probe_environment(args.yue_root, args.output)
    print(json.dumps(probe_results, indent=2))
