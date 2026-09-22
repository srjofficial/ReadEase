import os
import io
import csv
import zipfile
from collections import defaultdict
import numpy as np
import joblib
from sklearn.model_selection import StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score, accuracy_score, recall_score, precision_score


def find_dataset_zip() -> str:
    """Find DD-main.zip from common project paths"""
    candidates = [
        "DD-main.zip",
        "../DD-main.zip",
        "../../DD-main.zip",
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", "DD-main.zip"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "DD-main.zip"),
        "c:/Users/saroj/projects/ReadEase/DD-main.zip"
    ]
    for c in candidates:
        abs_c = os.path.abspath(c)
        if os.path.exists(abs_c):
            return abs_c
    raise FileNotFoundError("Could not find DD-main.zip in workspace")


def extract_features_and_cohort_stats():
    zip_path = find_dataset_zip()
    print(f"Loading DD-main dataset from: {zip_path}")

    with zipfile.ZipFile(zip_path, "r") as z:
        target_file = "DD-main/DD-V2/Datasets/Data_binary.csv"
        if target_file not in z.namelist():
            raise FileNotFoundError(f"{target_file} not found inside {zip_path}")

        f = io.StringIO(z.read(target_file).decode("utf-8", errors="ignore"))
        reader = csv.DictReader(f)

        subjects = defaultdict(lambda: {"group": None, "durs": [], "xs": [], "ys": [], "words": []})
        for row in reader:
            s_id = row["SubjectID"]
            group = int(row["Group"])
            subjects[s_id]["group"] = group
            subjects[s_id]["durs"].append(float(row["FIX_DURATION"]))
            subjects[s_id]["xs"].append(float(row["FIX_X"]))
            subjects[s_id]["ys"].append(float(row["FIX_Y"]))
            subjects[s_id]["words"].append(int(row["Word_Number"]))

    print(f"Parsed {len(subjects)} subjects. Extracting eye-movement biomarkers...")

    feature_names = [
        "mean_dur",
        "std_dur",
        "median_dur",
        "q75_dur",
        "q25_dur",
        "total_fix",
        "mean_saccade_len",
        "std_saccade_len",
        "reg_rate",
        "reg_count",
        "total_reading_time",
        "unique_words_fixated"
    ]

    X = []
    y = []

    for s_id, data in subjects.items():
        durs = np.array(data["durs"])
        xs = np.array(data["xs"])
        ys = np.array(data["ys"])

        if len(durs) < 3:
            continue

        dx = np.diff(xs)
        dy = np.diff(ys)
        saccade_lengths = np.sqrt(dx**2 + dy**2)

        reg_count = 0
        total_line_saccades = 0
        for i in range(len(dx)):
            if abs(dy[i]) < 50:
                total_line_saccades += 1
                if dx[i] < -20:
                    reg_count += 1
        reg_rate = reg_count / max(1, total_line_saccades)

        mean_dur = float(np.mean(durs))
        std_dur = float(np.std(durs))
        median_dur = float(np.median(durs))
        q75_dur = float(np.percentile(durs, 75))
        q25_dur = float(np.percentile(durs, 25))
        total_fix = float(len(durs))
        mean_saccade_len = float(np.mean(saccade_lengths)) if len(saccade_lengths) > 0 else 0.0
        std_saccade_len = float(np.std(saccade_lengths)) if len(saccade_lengths) > 0 else 0.0
        total_reading_time = float(np.sum(durs))
        unique_words_fixated = float(len(set(data["words"])))

        feat_vector = [
            mean_dur,
            std_dur,
            median_dur,
            q75_dur,
            q25_dur,
            total_fix,
            mean_saccade_len,
            std_saccade_len,
            reg_rate,
            float(reg_count),
            total_reading_time,
            unique_words_fixated
        ]

        X.append(feat_vector)
        # Group 1: Typical/Control (0), Group 2: Dyslexia (1)
        y.append(1 if data["group"] == 2 else 0)

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int32)

    control_idx = np.where(y == 0)[0]
    dyslexia_idx = np.where(y == 1)[0]

    def compute_stats(indices):
        subset = X[indices]
        stats = {}
        for idx, name in enumerate(feature_names):
            vals = subset[:, idx]
            stats[name] = {
                "mean": round(float(np.mean(vals)), 2),
                "std": round(float(np.std(vals)), 2),
                "median": round(float(np.median(vals)), 2),
                "q25": round(float(np.percentile(vals, 25)), 2),
                "q75": round(float(np.percentile(vals, 75)), 2)
            }
        return stats

    cohort_stats = {
        "control": compute_stats(control_idx),
        "dyslexia": compute_stats(dyslexia_idx)
    }

    print(f"Extracted {len(X)} valid subjects.")
    print(f"  Controls: {len(control_idx)} ({len(control_idx)/len(X)*100:.1f}%)")
    print(f"  Dyslexia: {len(dyslexia_idx)} ({len(dyslexia_idx)/len(X)*100:.1f}%)")

    return X, y, feature_names, cohort_stats


def train_and_save_model():
    X, y, feature_names, cohort_stats = extract_features_and_cohort_stats()

    # 5-fold Stratified Cross-Validation
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    aucs, accs, recs = [], [], []

    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
        X_train, y_train = X[train_idx], y[train_idx]
        X_val, y_val = X[val_idx], y[val_idx]

        model = RandomForestClassifier(
            n_estimators=150,
            max_depth=8,
            class_weight="balanced",
            random_state=42 + fold,
            n_jobs=-1
        )
        model.fit(X_train, y_train)

        val_probs = model.predict_proba(X_val)[:, 1]
        val_preds = model.predict(X_val)

        auc = roc_auc_score(y_val, val_probs)
        acc = accuracy_score(y_val, val_preds)
        rec = recall_score(y_val, val_preds)

        aucs.append(auc)
        accs.append(acc)
        recs.append(rec)

    mean_auc = float(np.mean(aucs))
    mean_acc = float(np.mean(accs))
    mean_rec = float(np.mean(recs))

    print("\n--- Cross-Validation Results ---")
    print(f"Mean ROC-AUC: {mean_auc:.4f}")
    print(f"Mean Accuracy: {mean_acc:.4f}")
    print(f"Mean Sensitivity (Recall): {mean_rec:.4f}")

    # Train final model on full dataset
    final_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=9,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    final_model.fit(X, y)

    # Output directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(current_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    out_path = os.path.join(models_dir, "dd_dyslexia_model.joblib")

    model_payload = {
        "model": final_model,
        "feature_names": feature_names,
        "cohort_stats": cohort_stats,
        "metadata": {
            "dataset": "DD-main (PLoS ONE 2023)",
            "total_subjects": len(X),
            "control_subjects": int(np.sum(y == 0)),
            "dyslexia_subjects": int(np.sum(y == 1)),
            "cv_roc_auc": round(mean_auc, 4),
            "cv_accuracy": round(mean_acc, 4),
            "cv_recall": round(mean_rec, 4)
        }
    }

    joblib.dump(model_payload, out_path)
    print(f"\nModel successfully trained and saved to: {out_path}")
    print(f"File size: {os.path.getsize(out_path)} bytes")
    return out_path


if __name__ == "__main__":
    train_and_save_model()
