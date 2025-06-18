from django.db import models

class JunctionSignals(models.Model):
    name = models.CharField(max_length=255)

class TrafficLog(models.Model):
    junction = models.ForeignKey(JunctionSignals, on_delete=models.CASCADE, null= True, blank= True)
    videos = models.FileField(upload_to='videos/', null=True, blank=True)
    processed_videos = models.FileField(upload_to='processed_videos/', null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    signal_id = models.IntegerField()
    vehicle_count = models.IntegerField()
    traffic_weight = models.FloatField()
    green_time = models.IntegerField()
    efficiency_score = models.FloatField()
    Car = models.IntegerField(default=0)
    Truck = models.IntegerField(default=0)
    Motorcycle = models.IntegerField(default=0)
    Bicycle = models.IntegerField(default=0)
    Bus = models.IntegerField(default=0)
    last_update = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Signal {self.signal_id} @ {self.timestamp}"