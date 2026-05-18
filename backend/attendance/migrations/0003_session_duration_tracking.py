from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0002_alter_attendance_unique_together_attendance_course_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='session',
            name='end_time',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='session',
            name='duration_minutes',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='session',
            name='teacher_note',
            field=models.TextField(blank=True, default=''),
        ),
    ]
