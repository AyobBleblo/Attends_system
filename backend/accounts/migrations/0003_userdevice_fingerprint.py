from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_add_student_major_and_semester_total_lectures'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserDevice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('device_fingerprint', models.CharField(
                    db_index=True,
                    help_text="SHA-256 / FingerprintJS visitor ID of the student's trusted device.",
                    max_length=255,
                    verbose_name='Device Fingerprint',
                )),
                ('linked_at', models.DateTimeField(auto_now_add=True, verbose_name='Linked At')),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='device',
                    to='auth.user',
                    verbose_name='User',
                )),
            ],
            options={
                'verbose_name': 'User Device',
                'verbose_name_plural': 'User Devices',
            },
        ),
    ]
