import datetime

LOCAL_UTC_OFFSET_HOURS = -6

def now_local() -> datetime.datetime:
    return datetime.datetime.utcnow() + datetime.timedelta(hours=LOCAL_UTC_OFFSET_HOURS)
