import smtplib
import logging
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger(__name__)

def _send_alert_email_sync(to_email: str, sensor_name: str, metric_name: str, current_value: float, unit: str, condition: str, threshold: float, severity: str, fired_at_str: str, rule_name: str = None, custom_message: str = None):
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("[EMAIL] Configuración SMTP incompleta. Correo no enviado.")
        return False

    cond_sym = {
        "gt": ">",
        "lt": "<",
        "gte": "≥",
        "lte": "≤"
    }.get(condition, condition)

    severity_color = "#dc2626" if severity == "critical" else "#f59e0b"
    severity_label = "CRÍTICA" if severity == "critical" else "ADVERTENCIA"
    unit_str = f" {unit}" if unit else ""

    display_title = f"{rule_name} ({sensor_name})" if rule_name else f"{sensor_name}: {metric_name}"
    subject = f"[{severity_label}] Alerta activada: {display_title}"

    custom_msg_block = ""
    if custom_message:
        custom_msg_block = f"""
        <div style="background-color: rgba(0, 240, 255, 0.08); border-left: 4px solid #00F0FF; padding: 14px 16px; border-radius: 4px; margin: 18px 0; color: #e2e8f0; font-size: 14px; line-height: 1.5;">
          <strong style="color: #00F0FF; display: block; margin-bottom: 4px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Mensaje / Instrucción Personalizada:</strong>
          {custom_message}
        </div>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }}
        .card {{ background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; max-width: 560px; margin: 0 auto; padding: 28px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }}
        .header {{ border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px; }}
        .badge {{ display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; text-transform: uppercase; background-color: {severity_color}; color: #ffffff; }}
        .title {{ font-size: 20px; font-weight: bold; margin-top: 12px; color: #ffffff; }}
        .metric-box {{ background-color: #0f172a; border-radius: 8px; padding: 18px; margin: 20px 0; border: 1px solid #334155; text-align: center; }}
        .metric-value {{ font-size: 32px; font-weight: 800; color: {severity_color}; }}
        .metric-rule {{ font-size: 14px; color: #94a3b8; margin-top: 6px; }}
        .details {{ width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px; }}
        .details td {{ padding: 8px 0; border-bottom: 1px solid #334155; }}
        .details td.label {{ color: #94a3b8; width: 40%; }}
        .details td.val {{ color: #f8fafc; font-weight: 600; }}
        .footer {{ margin-top: 24px; font-size: 12px; color: #64748b; text-align: center; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="badge">{severity_label}</span>
          <div class="title">{rule_name or "Alerta de Umbral Superado"}</div>
        </div>
        <p style="color: #cbd5e1; font-size: 15px; margin: 0 0 16px 0;">
          Se ha disparado una regla de alerta en el dispositivo <strong>{sensor_name}</strong>.
        </p>
        <div class="metric-box">
          <div class="metric-value">{current_value}{unit_str}</div>
          <div class="metric-rule">Condición: {metric_name} {cond_sym} {threshold}{unit_str}</div>
        </div>
        {custom_msg_block}
        <table class="details">
          <tr>
            <td class="label">Sensor / Dispositivo:</td>
            <td class="val">{sensor_name}</td>
          </tr>
          <tr>
            <td class="label">Métrica:</td>
            <td class="val">{metric_name}</td>
          </tr>
          <tr>
            <td class="label">Valor Registrado:</td>
            <td class="val" style="color: {severity_color};">{current_value}{unit_str}</td>
          </tr>
          <tr>
            <td class="label">Umbral Configurado:</td>
            <td class="val">{cond_sym} {threshold}{unit_str}</td>
          </tr>
          <tr>
            <td class="label">Fecha y Hora:</td>
            <td class="val">{fired_at_str}</td>
          </tr>
        </table>
        <div class="footer">
          Notificación automática enviada por la plataforma ad-mesh.
        </div>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    sender_name = settings.EMAIL_FROM_NAME or "ad-mesh Alertas"
    sender_email = settings.EMAIL_FROM or settings.SMTP_USER
    msg["From"] = f"{sender_name} <{sender_email}>"
    msg["To"] = to_email
    msg["Subject"] = subject

    msg.attach(MIMEText(html_content, "html"))

    try:
        if settings.SMTP_USE_SSL or settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
            if settings.SMTP_USE_TLS:
                server.starttls()

        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(sender_email, [to_email], msg.as_string())
        server.quit()
        logger.info(f"[EMAIL] Alerta enviada a {to_email} ({sensor_name}: {metric_name})")
        return True
    except Exception as e:
        logger.error(f"[EMAIL] Error enviando correo de alerta a {to_email}: {e}")
        return False


async def send_alert_notification_email(
    to_email: str,
    sensor_name: str,
    metric_name: str,
    current_value: float,
    unit: str,
    condition: str,
    threshold: float,
    severity: str,
    fired_at_str: str,
    rule_name: str = None,
    custom_message: str = None
):
    if not to_email:
        return
    await asyncio.to_thread(
        _send_alert_email_sync,
        to_email,
        sensor_name,
        metric_name,
        current_value,
        unit,
        condition,
        threshold,
        severity,
        fired_at_str,
        rule_name,
        custom_message
    )
