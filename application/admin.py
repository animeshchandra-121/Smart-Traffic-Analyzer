from django.contrib import admin
from .models import TrafficLog
from .services import log_traffic_data
# Register your models here.

admin.site.register(TrafficLog)
