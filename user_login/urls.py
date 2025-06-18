from django.urls import path
from .views import UserProfileView, UserLoginView, UserLogout, DeleteUser

urlpatterns = [
    path('signup/', UserProfileView.as_view(), name='signup'),
    path('signin/', UserLoginView.as_view(), name='signin'),
    path('logout/', UserLogout.as_view(), name='logout'),
    path('delete/', DeleteUser.as_view(), name='delete'),
]