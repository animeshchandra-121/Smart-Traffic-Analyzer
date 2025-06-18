from rest_framework import serializers
from .models import UserProfile
from django.contrib.auth.models import User

class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    email = serializers.EmailField(source='user.email')
    password = serializers.CharField(write_only=True, source='user.password', style={'input_type': 'password'})
    class Meta:
        model = UserProfile
        fields = ['username', 'password', 'email']
        
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        password = user_data.pop('password')

        user = User(**user_data)
        user.set_password(password)  # hash the password
        user.save()

        user_profile = UserProfile.objects.create(user=user, **validated_data)
        return user_profile