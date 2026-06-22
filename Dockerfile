# استخدام نسخة بايثون خفيفة
FROM python:3.9-slim

# مجلد العمل
WORKDIR /app

# نسخ وتثبيت المكتبات
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# نسخ جميع ملفات المشروع
COPY . .

# فتح المنفذ
EXPOSE 7860

# تشغيل التطبيق بـ Gunicorn مع دعم WebSockets عبر eventlet
CMD ["gunicorn", "-k", "eventlet", "-w", "1", "-b", "0.0.0.0:7860", "app:app"]
