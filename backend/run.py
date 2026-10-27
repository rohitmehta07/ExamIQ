import os

os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import uvicorn

if __name__ == "__main__" :
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
