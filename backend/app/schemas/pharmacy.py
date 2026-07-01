from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel


class DispensedItem(BaseModel):
    medicine_name: str
    quantity: int


class DispenseCreate(BaseModel):
    patient_id: str
    prescription_id: UUID
    medicines_dispensed: list[DispensedItem]
    dispensed_by: UUID


class DispenseOut(BaseModel):
    dispense_id: UUID
    patient_id: str
    prescription_id: UUID
    medicines_dispensed: list
    dispensed_by: UUID
    dispensed_at: datetime

    model_config = {"from_attributes": True}


class InventoryCreate(BaseModel):
    medicine_name: str
    generic_name: str | None = None
    quantity_available: int = 0
    unit: str = "tablets"
    reorder_level: int = 50
    expiry_date: date | None = None


class InventoryUpdate(BaseModel):
    quantity_available: int | None = None
    reorder_level: int | None = None
    expiry_date: date | None = None


class InventoryOut(BaseModel):
    item_id: UUID
    medicine_name: str
    generic_name: str | None
    quantity_available: int
    unit: str
    reorder_level: int
    expiry_date: date | None
    last_updated: datetime
    is_low_stock: bool = False

    model_config = {"from_attributes": True}
