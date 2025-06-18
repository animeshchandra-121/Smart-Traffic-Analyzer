from django.urls import path
from .views import TrafficLogView, latest_stats, AdaptiveGreenTime, junctions_list
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('api/log/', TrafficLogView.as_view(), name='upload_api'),
    path('api/latest-stats/', latest_stats, name='latest_stats'),
    path('api/adaptive-green-time/', AdaptiveGreenTime.as_view(), name='adaptive_green_time'),
    path('api/junctions/', junctions_list, name='junctions_list'),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)