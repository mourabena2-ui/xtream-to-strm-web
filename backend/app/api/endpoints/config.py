from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.settings import SettingsModel
from app.schemas import ConfigUpdate, ConfigResponse
from app.api import deps

router = APIRouter()

@router.get("/", response_model=ConfigResponse, dependencies=[Depends(deps.get_current_user)])
def get_config(db: Session = Depends(get_db)):
    settings = {s.key: s.value for s in db.query(SettingsModel).all()}
    return ConfigResponse(**settings)

@router.post("/", response_model=ConfigResponse)
def update_config(config: ConfigUpdate, db: Session = Depends(get_db), current_user = Depends(deps.get_current_user)):
    updates = {}
    if config.XC_URL is not None:
        updates["XC_URL"] = config.XC_URL
    if config.XC_USER is not None:
        updates["XC_USER"] = config.XC_USER
    if config.XC_PASS is not None:
        updates["XC_PASS"] = config.XC_PASS
    if config.OUTPUT_DIR is not None:
        updates["OUTPUT_DIR"] = config.OUTPUT_DIR
    if config.MOVIES_DIR is not None:
        updates["MOVIES_DIR"] = config.MOVIES_DIR
    if config.SERIES_DIR is not None:
        updates["SERIES_DIR"] = config.SERIES_DIR
    
    for key, value in updates.items():
        setting = db.query(SettingsModel).filter(SettingsModel.key == key).first()
        if not setting:
            setting = SettingsModel(key=key, value=value)
            db.add(setting)
        else:
            setting.value = value
    db.commit()
    
    settings = {s.key: s.value for s in db.query(SettingsModel).all()}
    return ConfigResponse(**settings)
